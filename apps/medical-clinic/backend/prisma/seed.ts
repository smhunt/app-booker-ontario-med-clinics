import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Check CANADA_PHIPA_READY flag
  const phipaReady = process.env.CANADA_PHIPA_READY === 'true';

  if (phipaReady) {
    console.warn('⚠️  CANADA_PHIPA_READY=true: PHI storage enabled. Ensure legal checklist is complete.');
  } else {
    console.log('✅ CANADA_PHIPA_READY=false: Using synthetic data only (safe mode).');
  }

  // Load seed data
  const seedDataPath = path.join(__dirname, 'seed/seedData.json');
  const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.familyMemberBooking.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.patientAccount.deleteMany();
  await prisma.oabWindow.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.appointmentType.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.user.deleteMany();
  await prisma.clinic.deleteMany();

  // Create clinic
  console.log('🏥 Creating clinic...');
  const clinic = await prisma.clinic.create({
    data: {
      name: seedData.clinic.name,
      type: seedData.clinic.type,
      address: seedData.clinic.address,
      phone: seedData.clinic.phone,
      email: seedData.clinic.email,
      hours: seedData.clinic.hours,
    },
  });

  // Create providers
  console.log('👨‍⚕️ Creating providers...');
  const providers = [];
  for (const providerData of seedData.providers) {
    const provider = await prisma.provider.create({
      data: {
        name: providerData.name,
        displayName: providerData.displayName,
        specialty: providerData.specialty,
        team: providerData.team,
        workingHours: providerData.workingHours,
        rosterStatus: providerData.rosterStatus,
        acceptsNewPatients: providerData.acceptsNewPatients,
        bio: providerData.bio,
        photoUrl: providerData.photoUrl,
        clinicId: clinic.id,
      },
    });
    providers.push(provider);
  }

  // Create appointment types
  console.log('📅 Creating appointment types...');
  const appointmentTypes = [];
  for (const typeData of seedData.appointmentTypes) {
    const type = await prisma.appointmentType.create({
      data: {
        name: typeData.name,
        duration: typeData.duration,
        description: typeData.description,
        isActive: true,
        isCommon: typeData.isCommon || false,
      },
    });
    appointmentTypes.push(type);
  }

  // Create patients
  console.log('👥 Creating patients (25 total)...');
  for (const patientData of seedData.patients) {
    // Assign preferred provider (80% get assigned)
    const preferredProviderId = Math.random() < 0.8
      ? providers[Math.floor(Math.random() * providers.length)].id
      : null;

    await prisma.patient.create({
      data: {
        name: patientData.name,
        dob: new Date(patientData.dob),
        gender: patientData.gender,
        fakeMrn: patientData.fakeMrn,
        email: patientData.email,
        smsNumber: patientData.smsNumber,
        postalCode: patientData.postalCode,
        rostered: patientData.rostered,
        consentNotifications: patientData.consentNotifications,
        canReceiveSms: patientData.canReceiveSms,
        notificationChannel: patientData.notificationChannel,
        languages: patientData.languages,
        chronicConditions: patientData.chronicConditions,
        preferredProviderId,
      },
    });
  }

  // Create admin users
  console.log('🔐 Creating admin users...');
  for (const userData of seedData.adminUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        role: userData.role,
        isActive: true,
      },
    });
  }

  // =============================================================================
  // NEW: Create PatientAccount and FamilyMember records
  // This demonstrates the Account → CareRecipient model where users can book
  // appointments for themselves and their dependents (children, elderly relatives)
  // =============================================================================
  console.log('👨‍👩‍👧‍👦 Creating patient accounts and family members...');

  // Helper to calculate age from DOB
  const calculateAge = (dob: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  // Sample additional family members to add to some accounts
  const additionalFamilyMembers = [
    {
      name: 'Emma Thompson (Child)',
      relationship: 'child',
      gender: 'female',
      yearsOld: 8,
      chronicConditions: [],
      allergies: ['peanuts'],
      canSelfConsent: false,
    },
    {
      name: 'James Thompson (Child)',
      relationship: 'child',
      gender: 'male',
      yearsOld: 5,
      chronicConditions: ['asthma'],
      allergies: [],
      canSelfConsent: false,
    },
    {
      name: 'Margaret Wilson (Parent)',
      relationship: 'parent',
      gender: 'female',
      yearsOld: 78,
      chronicConditions: ['hypertension', 'diabetes'],
      allergies: ['penicillin'],
      canSelfConsent: true,
    },
    {
      name: 'Robert Chen (Spouse)',
      relationship: 'spouse',
      gender: 'male',
      yearsOld: 42,
      chronicConditions: [],
      allergies: [],
      canSelfConsent: true,
    },
  ];

  let patientAccountCount = 0;
  let familyMemberCount = 0;
  let additionalMemberIndex = 0;

  for (const patientData of seedData.patients) {
    const dob = new Date(patientData.dob);
    const age = calculateAge(dob);

    // Only create PatientAccounts for adults (18+) who can manage accounts
    // Children in the legacy Patient model would be family members of adult accounts
    if (age >= 18) {
      // Create PatientAccount (the authenticated user)
      const account = await prisma.patientAccount.create({
        data: {
          email: patientData.email,
          name: patientData.name,
          phone: patientData.smsNumber,
          notificationChannel: patientData.notificationChannel,
          consentNotifications: patientData.consentNotifications,
          canReceiveSms: patientData.canReceiveSms,
          languages: patientData.languages,
          preferredProviderId: null, // Will be set separately if needed
          isActive: true,
        },
      });
      patientAccountCount++;

      // Create FamilyMember with relationship='self' for the account holder
      await prisma.familyMember.create({
        data: {
          accountId: account.id,
          name: patientData.name,
          dateOfBirth: dob,
          relationship: 'self',
          gender: patientData.gender,
          healthCardNumber: null, // OHIP number - would be encrypted in production
          postalCode: patientData.postalCode,
          chronicConditions: patientData.chronicConditions,
          allergies: [],
          canSelfConsent: true,
          isActive: true,
        },
      });
      familyMemberCount++;

      // Add additional family members to some accounts (every 4th adult account)
      if (patientAccountCount % 4 === 0 && additionalMemberIndex < additionalFamilyMembers.length) {
        const additionalMember = additionalFamilyMembers[additionalMemberIndex];
        const memberDob = new Date();
        memberDob.setFullYear(memberDob.getFullYear() - additionalMember.yearsOld);

        await prisma.familyMember.create({
          data: {
            accountId: account.id,
            name: additionalMember.name,
            dateOfBirth: memberDob,
            relationship: additionalMember.relationship,
            gender: additionalMember.gender,
            healthCardNumber: null,
            postalCode: patientData.postalCode, // Same postal code as account holder
            chronicConditions: additionalMember.chronicConditions,
            allergies: additionalMember.allergies,
            canSelfConsent: additionalMember.canSelfConsent,
            isActive: true,
          },
        });
        familyMemberCount++;
        additionalMemberIndex++;
      }
    }
  }

  console.log(`   Created ${patientAccountCount} patient accounts`);
  console.log(`   Created ${familyMemberCount} family members (${familyMemberCount - patientAccountCount} dependents)`)

  // Create sample OAB windows for each provider
  console.log('🕐 Creating OAB windows...');
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  for (const provider of providers) {
    for (const day of daysOfWeek) {
      const hours = provider.workingHours[day];
      if (hours && hours !== 'off') {
        await prisma.oabWindow.create({
          data: {
            providerId: provider.id,
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '12:00', // Morning slots available for OAB
            isActive: true,
          },
        });
      }
    }
  }

  console.log('✅ Seed completed successfully!');
  console.log(`   - Clinic: ${clinic.name}`);
  console.log(`   - Providers: ${providers.length}`);
  console.log(`   - Patients (legacy): ${seedData.patients.length}`);
  console.log(`   - Patient Accounts (new): ${patientAccountCount}`);
  console.log(`   - Family Members (new): ${familyMemberCount}`);
  console.log(`   - Appointment Types: ${appointmentTypes.length}`);
  console.log(`   - Admin Users: ${seedData.adminUsers.length}`);
  console.log('');
  console.log('Default login credentials:');
  console.log('   Admin: admin@ildertonhealth-demo.ca / Admin123!');
  console.log('   Staff: staff@ildertonhealth-demo.ca / Staff123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
