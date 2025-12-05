-- Add clerkUserId to Patient table for Clerk authentication
ALTER TABLE "Patient" ADD COLUMN "clerkUserId" TEXT;

-- Create unique constraint on clerkUserId
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_clerkUserId_key" UNIQUE ("clerkUserId");

-- Create index for faster lookups
CREATE INDEX "Patient_clerkUserId_idx" ON "Patient"("clerkUserId");
