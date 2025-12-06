-- AlterTable
ALTER TABLE "AppointmentType" ADD COLUMN     "isCommon" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PatientAccount" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "notificationChannel" TEXT NOT NULL DEFAULT 'email',
    "consentNotifications" BOOLEAN NOT NULL DEFAULT true,
    "canReceiveSms" BOOLEAN NOT NULL DEFAULT true,
    "languages" JSONB NOT NULL DEFAULT '["en"]',
    "preferredProviderId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "relationship" TEXT NOT NULL DEFAULT 'self',
    "gender" TEXT NOT NULL,
    "healthCardNumber" TEXT,
    "postalCode" TEXT,
    "chronicConditions" JSONB NOT NULL DEFAULT '[]',
    "allergies" JSONB NOT NULL DEFAULT '[]',
    "canSelfConsent" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMemberBooking" (
    "id" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "appointmentTypeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "notes" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyMemberBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientAccount_clerkUserId_key" ON "PatientAccount"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientAccount_email_key" ON "PatientAccount"("email");

-- CreateIndex
CREATE INDEX "PatientAccount_clerkUserId_idx" ON "PatientAccount"("clerkUserId");

-- CreateIndex
CREATE INDEX "PatientAccount_email_idx" ON "PatientAccount"("email");

-- CreateIndex
CREATE INDEX "FamilyMember_accountId_idx" ON "FamilyMember"("accountId");

-- CreateIndex
CREATE INDEX "FamilyMember_relationship_idx" ON "FamilyMember"("relationship");

-- CreateIndex
CREATE INDEX "FamilyMemberBooking_familyMemberId_idx" ON "FamilyMemberBooking"("familyMemberId");

-- CreateIndex
CREATE INDEX "FamilyMemberBooking_providerId_date_idx" ON "FamilyMemberBooking"("providerId", "date");

-- CreateIndex
CREATE INDEX "FamilyMemberBooking_status_idx" ON "FamilyMemberBooking"("status");

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PatientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMemberBooking" ADD CONSTRAINT "FamilyMemberBooking_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
