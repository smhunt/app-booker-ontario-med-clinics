import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Veterinary Clinic Seed Data
 * Creates fictional data for development and testing
 *
 * Clinic: "Pawsitive Care Veterinary Clinic - Demo"
 * - 6 Veterinarians
 * - 10 Pet Owners
 * - 25 Pets (12 dogs, 8 cats, 2 rabbits, 2 birds, 1 reptile)
 * - 15 Appointment Types
 */

async function main() {
  console.log('🌱 Seeding veterinary clinic database...\n');

  // Clear existing data
  await prisma.booking.deleteMany();
  await prisma.pet.deleteMany();
  await prisma.petOwner.deleteMany();
  await prisma.appointmentType.deleteMany();
  await prisma.veterinarian.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.auditLog.deleteMany();

  // Create Admin Users
  console.log('Creating admin users...');
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  const staffPassword = await bcrypt.hash('Staff123!', 10);

  await prisma.admin.createMany({
    data: [
      {
        name: 'Vet Admin',
        email: 'admin@vetclinic-demo.ca',
        password: hashedPassword,
        role: 'admin',
      },
      {
        name: 'Reception Staff',
        email: 'staff@vetclinic-demo.ca',
        password: staffPassword,
        role: 'clinic_staff',
      },
    ],
  });

  // Create Veterinarians (6 total)
  console.log('Creating veterinarians...');
  const vets = await Promise.all([
    // General Practice (2)
    prisma.veterinarian.create({
      data: {
        name: 'Dr. Sarah Mitchell',
        displayName: 'Dr. Mitchell, DVM',
        email: 'smitchell@vetclinic-demo.ca',
        password: hashedPassword,
        specialty: 'General Practice',
        licenseNumber: 'ON-DVM-12345',
        team: 'A',
        acceptsNewClients: true,
        languages: ['en', 'fr'],
      },
    }),
    prisma.veterinarian.create({
      data: {
        name: 'Dr. James Chen',
        displayName: 'Dr. Chen, DVM',
        email: 'jchen@vetclinic-demo.ca',
        password: hashedPassword,
        specialty: 'General Practice',
        licenseNumber: 'ON-DVM-12346',
        team: 'A',
        acceptsNewClients: true,
        languages: ['en', 'zh'],
      },
    }),
    // Surgery (2)
    prisma.veterinarian.create({
      data: {
        name: 'Dr. Emily Rodriguez',
        displayName: 'Dr. Rodriguez, DVM, DACVS',
        email: 'erodriguez@vetclinic-demo.ca',
        password: hashedPassword,
        specialty: 'Surgery',
        licenseNumber: 'ON-DVM-12347',
        team: 'B',
        acceptsNewClients: false,
        languages: ['en', 'es'],
      },
    }),
    prisma.veterinarian.create({
      data: {
        name: 'Dr. Michael Thompson',
        displayName: 'Dr. Thompson, DVM, DACVS',
        email: 'mthompson@vetclinic-demo.ca',
        password: hashedPassword,
        specialty: 'Surgery',
        licenseNumber: 'ON-DVM-12348',
        team: 'B',
        acceptsNewClients: false,
        languages: ['en'],
      },
    }),
    // Dentistry (1)
    prisma.veterinarian.create({
      data: {
        name: 'Dr. Lisa Park',
        displayName: 'Dr. Park, DVM, DAVDC',
        email: 'lpark@vetclinic-demo.ca',
        password: hashedPassword,
        specialty: 'Dentistry',
        licenseNumber: 'ON-DVM-12349',
        team: 'C',
        acceptsNewClients: true,
        languages: ['en', 'ko'],
      },
    }),
    // Exotic Animals (1)
    prisma.veterinarian.create({
      data: {
        name: 'Dr. David Wilson',
        displayName: 'Dr. Wilson, DVM, DABVP (Avian)',
        email: 'dwilson@vetclinic-demo.ca',
        password: hashedPassword,
        specialty: 'Exotic Animals',
        licenseNumber: 'ON-DVM-12350',
        team: 'C',
        acceptsNewClients: true,
        languages: ['en'],
      },
    }),
  ]);

  console.log(`Created ${vets.length} veterinarians`);

  // Create Appointment Types (15 types)
  console.log('Creating appointment types...');
  const appointmentTypes = await prisma.appointmentType.createMany({
    data: [
      { name: 'Wellness Exam', duration: 30, description: 'Annual wellness checkup', isCommon: true },
      { name: 'Vaccination', duration: 15, description: 'Routine vaccinations', isCommon: true },
      { name: 'Sick Visit', duration: 30, description: 'Evaluation of illness or injury', isCommon: true },
      { name: 'Surgery Consultation', duration: 45, description: 'Pre-surgery evaluation', isCommon: false },
      { name: 'Dental Cleaning', duration: 60, description: 'Professional dental cleaning under anesthesia', isCommon: true },
      { name: 'Dental Exam', duration: 30, description: 'Oral health evaluation', isCommon: false },
      { name: 'Spay/Neuter Consult', duration: 20, description: 'Pre-operative consultation', isCommon: true },
      { name: 'Senior Pet Wellness', duration: 45, description: 'Comprehensive senior pet exam', isCommon: false },
      { name: 'Puppy/Kitten Visit', duration: 30, description: 'New pet wellness check', isCommon: true },
      { name: 'Exotic Pet Exam', duration: 45, description: 'Exam for birds, reptiles, small mammals', isCommon: false, requiresSpecies: ['bird', 'reptile', 'rabbit'] },
      { name: 'Follow-up Visit', duration: 15, description: 'Post-treatment follow-up', isCommon: true },
      { name: 'Emergency Triage', duration: 30, description: 'Urgent care evaluation', isCommon: false },
      { name: 'Behavior Consultation', duration: 60, description: 'Behavior assessment and guidance', isCommon: false },
      { name: 'Nutritional Counseling', duration: 30, description: 'Diet and nutrition advice', isCommon: false },
      { name: 'Euthanasia Consultation', duration: 45, description: 'End-of-life consultation', isCommon: false },
    ],
  });

  console.log(`Created ${appointmentTypes.count} appointment types`);

  // Create Pet Owners (10 total)
  console.log('Creating pet owners...');
  const owners = await Promise.all([
    prisma.petOwner.create({
      data: {
        name: 'Jennifer Smith',
        email: 'jsmith@example.com',
        phone: '+1-519-555-0101',
        address: '123 Maple Street',
        postalCode: 'N0M 2A0',
        consentNotifications: true,
        canReceiveSMS: true,
        notificationChannel: 'email',
      },
    }),
    prisma.petOwner.create({
      data: {
        name: 'Robert Johnson',
        email: 'rjohnson@example.com',
        phone: '+1-519-555-0102',
        address: '456 Oak Avenue',
        postalCode: 'N0M 2A0',
        consentNotifications: true,
        canReceiveSMS: true,
        notificationChannel: 'sms',
      },
    }),
    prisma.petOwner.create({
      data: {
        name: 'Maria Garcia',
        email: 'mgarcia@example.com',
        phone: '+1-519-555-0103',
        address: '789 Pine Road',
        postalCode: 'N0M 1A0',
        consentNotifications: true,
        canReceiveSMS: false,
        notificationChannel: 'email',
        languages: ['en', 'es'],
      },
    }),
    prisma.petOwner.create({
      data: {
        name: 'William Davis',
        email: 'wdavis@example.com',
        phone: '+1-519-555-0104',
        address: '321 Elm Street',
        postalCode: 'N0M 2A0',
        consentNotifications: true,
        canReceiveSMS: true,
        notificationChannel: 'email',
      },
    }),
    prisma.petOwner.create({
      data: {
        name: 'Susan Wilson',
        email: 'swilson@example.com',
        phone: '+1-519-555-0105',
        address: '654 Birch Lane',
        postalCode: 'N0M 1A0',
        consentNotifications: true,
        canReceiveSMS: true,
        notificationChannel: 'sms',
      },
    }),
    prisma.petOwner.create({
      data: {
        name: 'Jean-Pierre Dubois',
        email: 'jpdubois@example.com',
        phone: '+1-519-555-0106',
        address: '987 Cedar Court',
        postalCode: 'N0M 2A0',
        consentNotifications: true,
        canReceiveSMS: false,
        notificationChannel: 'email',
        languages: ['fr', 'en'],
      },
    }),
    prisma.petOwner.create({
      data: {
        name: 'Amanda Brown',
        email: 'abrown@example.com',
        phone: '+1-519-555-0107',
        address: '147 Spruce Drive',
        postalCode: 'N0M 1A0',
        consentNotifications: true,
        canReceiveSMS: true,
        notificationChannel: 'email',
      },
    }),
    prisma.petOwner.create({
      data: {
        name: 'David Miller',
        email: 'dmiller@example.com',
        phone: '+1-519-555-0108',
        address: '258 Willow Way',
        postalCode: 'N0M 2A0',
        consentNotifications: true,
        canReceiveSMS: true,
        notificationChannel: 'email',
      },
    }),
    prisma.petOwner.create({
      data: {
        name: 'Lisa Anderson',
        email: 'landerson@example.com',
        phone: '+1-519-555-0109',
        address: '369 Ash Boulevard',
        postalCode: 'N0M 1A0',
        consentNotifications: true,
        canReceiveSMS: false,
        notificationChannel: 'voice',
      },
    }),
    prisma.petOwner.create({
      data: {
        name: 'Michael Taylor',
        email: 'mtaylor@example.com',
        phone: '+1-519-555-0110',
        address: '480 Walnut Circle',
        postalCode: 'N0M 2A0',
        consentNotifications: true,
        canReceiveSMS: true,
        notificationChannel: 'email',
      },
    }),
  ]);

  console.log(`Created ${owners.length} pet owners`);

  // Create Pets (25 total: 12 dogs, 8 cats, 2 rabbits, 2 birds, 1 reptile)
  console.log('Creating pets...');

  // Dogs (12)
  const dogs = await prisma.pet.createMany({
    data: [
      { name: 'Max', species: 'dog', breed: 'Golden Retriever', sex: 'neutered_male', weight: 32.5, dateOfBirth: new Date('2019-03-15'), ownerId: owners[0].id, allergies: [], chronicConditions: [] },
      { name: 'Bella', species: 'dog', breed: 'Labrador Retriever', sex: 'spayed_female', weight: 28.0, dateOfBirth: new Date('2020-06-22'), ownerId: owners[0].id, allergies: ['chicken'], chronicConditions: [] },
      { name: 'Charlie', species: 'dog', breed: 'German Shepherd', sex: 'male', weight: 38.0, dateOfBirth: new Date('2021-01-10'), ownerId: owners[1].id, allergies: [], chronicConditions: ['hip dysplasia'] },
      { name: 'Lucy', species: 'dog', breed: 'Beagle', sex: 'spayed_female', weight: 12.0, dateOfBirth: new Date('2018-09-05'), ownerId: owners[2].id, allergies: [], chronicConditions: [] },
      { name: 'Cooper', species: 'dog', breed: 'French Bulldog', sex: 'neutered_male', weight: 11.5, dateOfBirth: new Date('2022-04-18'), ownerId: owners[3].id, allergies: [], chronicConditions: ['brachycephalic syndrome'] },
      { name: 'Daisy', species: 'dog', breed: 'Poodle', sex: 'spayed_female', weight: 6.0, dateOfBirth: new Date('2020-11-30'), ownerId: owners[4].id, allergies: ['beef'], chronicConditions: [] },
      { name: 'Rocky', species: 'dog', breed: 'Rottweiler', sex: 'male', weight: 45.0, dateOfBirth: new Date('2019-07-14'), ownerId: owners[5].id, allergies: [], chronicConditions: [] },
      { name: 'Sadie', species: 'dog', breed: 'Australian Shepherd', sex: 'female', weight: 22.0, dateOfBirth: new Date('2023-02-28'), ownerId: owners[6].id, allergies: [], chronicConditions: [] },
      { name: 'Duke', species: 'dog', breed: 'Boxer', sex: 'neutered_male', weight: 30.0, dateOfBirth: new Date('2017-12-03'), ownerId: owners[7].id, allergies: [], chronicConditions: ['heart murmur'] },
      { name: 'Molly', species: 'dog', breed: 'Shih Tzu', sex: 'spayed_female', weight: 5.5, dateOfBirth: new Date('2016-05-20'), ownerId: owners[8].id, allergies: [], chronicConditions: ['dental disease'] },
      { name: 'Bear', species: 'dog', breed: 'Bernese Mountain Dog', sex: 'male', weight: 48.0, dateOfBirth: new Date('2021-08-12'), ownerId: owners[9].id, allergies: [], chronicConditions: [] },
      { name: 'Zoey', species: 'dog', breed: 'Border Collie', sex: 'female', weight: 18.0, dateOfBirth: new Date('2022-10-05'), ownerId: owners[9].id, allergies: [], chronicConditions: [] },
    ],
  });

  // Cats (8)
  const cats = await prisma.pet.createMany({
    data: [
      { name: 'Luna', species: 'cat', breed: 'Domestic Shorthair', sex: 'spayed_female', weight: 4.5, dateOfBirth: new Date('2020-02-14'), ownerId: owners[0].id, allergies: [], chronicConditions: [] },
      { name: 'Oliver', species: 'cat', breed: 'Maine Coon', sex: 'neutered_male', weight: 7.5, dateOfBirth: new Date('2019-11-08'), ownerId: owners[1].id, allergies: [], chronicConditions: [] },
      { name: 'Milo', species: 'cat', breed: 'Siamese', sex: 'neutered_male', weight: 4.0, dateOfBirth: new Date('2021-04-25'), ownerId: owners[2].id, allergies: [], chronicConditions: ['asthma'] },
      { name: 'Cleo', species: 'cat', breed: 'Persian', sex: 'spayed_female', weight: 3.5, dateOfBirth: new Date('2018-06-17'), ownerId: owners[3].id, allergies: [], chronicConditions: ['kidney disease'] },
      { name: 'Leo', species: 'cat', breed: 'Bengal', sex: 'male', weight: 5.5, dateOfBirth: new Date('2022-01-30'), ownerId: owners[4].id, allergies: [], chronicConditions: [] },
      { name: 'Nala', species: 'cat', breed: 'Ragdoll', sex: 'female', weight: 5.0, dateOfBirth: new Date('2023-03-12'), ownerId: owners[6].id, allergies: ['fish'], chronicConditions: [] },
      { name: 'Simba', species: 'cat', breed: 'Orange Tabby', sex: 'neutered_male', weight: 6.0, dateOfBirth: new Date('2017-09-22'), ownerId: owners[7].id, allergies: [], chronicConditions: ['diabetes'] },
      { name: 'Willow', species: 'cat', breed: 'British Shorthair', sex: 'spayed_female', weight: 4.8, dateOfBirth: new Date('2020-07-04'), ownerId: owners[8].id, allergies: [], chronicConditions: [] },
    ],
  });

  // Rabbits (2)
  const rabbits = await prisma.pet.createMany({
    data: [
      { name: 'Snowball', species: 'rabbit', breed: 'Holland Lop', sex: 'female', weight: 1.8, dateOfBirth: new Date('2022-03-20'), ownerId: owners[5].id, allergies: [], chronicConditions: [] },
      { name: 'Thumper', species: 'rabbit', breed: 'Mini Rex', sex: 'male', weight: 2.0, dateOfBirth: new Date('2021-12-15'), ownerId: owners[9].id, allergies: [], chronicConditions: [] },
    ],
  });

  // Birds (2)
  const birds = await prisma.pet.createMany({
    data: [
      { name: 'Kiwi', species: 'bird', breed: 'Cockatiel', sex: 'male', weight: 0.1, dateOfBirth: new Date('2020-05-10'), ownerId: owners[6].id, allergies: [], chronicConditions: [] },
      { name: 'Sunny', species: 'bird', breed: 'Budgerigar', sex: 'female', weight: 0.035, dateOfBirth: new Date('2023-01-05'), ownerId: owners[8].id, allergies: [], chronicConditions: [] },
    ],
  });

  // Reptile (1)
  const reptiles = await prisma.pet.createMany({
    data: [
      { name: 'Spike', species: 'reptile', breed: 'Bearded Dragon', sex: 'male', weight: 0.45, dateOfBirth: new Date('2021-06-01'), ownerId: owners[7].id, allergies: [], chronicConditions: [] },
    ],
  });

  const totalPets = dogs.count + cats.count + rabbits.count + birds.count + reptiles.count;
  console.log(`Created ${totalPets} pets (${dogs.count} dogs, ${cats.count} cats, ${rabbits.count} rabbits, ${birds.count} birds, ${reptiles.count} reptiles)`);

  console.log('\n✅ Seeding complete!\n');
  console.log('Default credentials:');
  console.log('  Admin: admin@vetclinic-demo.ca / Admin123!');
  console.log('  Staff: staff@vetclinic-demo.ca / Staff123!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
