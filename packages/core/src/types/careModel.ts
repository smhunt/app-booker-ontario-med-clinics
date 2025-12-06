/**
 * Care Model Types
 *
 * Unified abstraction for the Account → CareRecipient → Booking pattern
 * that works across both medical (Patient → FamilyMember) and veterinary
 * (PetOwner → Pet) domains.
 *
 * Key concepts:
 * - Account: The authenticated user who logs in and manages bookings
 * - CareRecipient: The entity receiving care (patient, child, pet, etc.)
 * - Booking: An appointment for a CareRecipient with a Provider
 */

import { BookingBase } from './index';

// ============================================================================
// Account - The authenticated user who manages care recipients
// ============================================================================

export type NotificationChannel = 'email' | 'sms' | 'voice';

export interface AccountBase {
  id: string;
  clerkUserId?: string; // External auth provider ID (Clerk)
  email: string;
  name: string;
  phone?: string;
  notificationChannel: NotificationChannel;
  consentNotifications: boolean;
  canReceiveSms: boolean;
  languages: string[];
  createdAt: Date;
  updatedAt?: Date;
}

// ============================================================================
// CareRecipient - The entity receiving care (person, pet, etc.)
// ============================================================================

export interface CareRecipientBase {
  id: string;
  accountId: string; // FK to Account
  name: string;
  dateOfBirth?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

// ============================================================================
// Medical Domain Extensions
// ============================================================================

export type FamilyRelationship =
  | 'self'
  | 'child'
  | 'spouse'
  | 'parent'
  | 'sibling'
  | 'grandparent'
  | 'guardian'
  | 'other';

export interface PatientAccount extends AccountBase {
  // Medical-specific account fields can be added here
  preferredProviderId?: string;
}

export interface FamilyMember extends CareRecipientBase {
  relationship: FamilyRelationship;
  gender: 'male' | 'female' | 'nonbinary' | 'prefer_not_to_say';
  healthCardNumber?: string; // OHIP number in Ontario
  chronicConditions: string[];
  allergies: string[];
  /**
   * Whether this person can consent for their own medical care.
   * false for minors and some adults with guardians.
   */
  canSelfConsent: boolean;
}

export interface MedicalBooking extends BookingBase {
  familyMemberId: string;
  familyMember?: FamilyMember;
  notes?: string;
}

// ============================================================================
// Veterinary Domain Extensions
// ============================================================================

export type PetSpecies =
  | 'dog'
  | 'cat'
  | 'bird'
  | 'rabbit'
  | 'reptile'
  | 'fish'
  | 'small_mammal'
  | 'other';

export interface PetOwnerAccount extends AccountBase {
  // Vet-specific account fields can be added here
  preferredVeterinarianId?: string;
}

export interface Pet extends CareRecipientBase {
  species: PetSpecies;
  breed?: string;
  sex?: 'male' | 'female' | 'unknown';
  weight?: number; // in kg
  microchipId?: string;
  isNeutered?: boolean;
}

export interface VetBooking extends BookingBase {
  petId: string;
  pet?: Pet;
  notes?: string;
}

// ============================================================================
// Generic Booking with CareRecipient
// ============================================================================

/**
 * Generic booking type that can work with any CareRecipient subtype.
 * Use this in shared route handlers and services.
 */
export interface CareRecipientBooking<T extends CareRecipientBase = CareRecipientBase>
  extends BookingBase {
  careRecipientId: string;
  careRecipient?: T;
  notes?: string;
}

// ============================================================================
// Route Handler Configuration
// ============================================================================

/**
 * Configuration for creating care recipient CRUD routes.
 * Used by the shared route factory to generate domain-specific endpoints.
 */
export interface CareRecipientRouteConfig<T extends CareRecipientBase> {
  /** Model name for responses (e.g., 'familyMember', 'pet') */
  modelName: string;
  /** Plural form for list responses (e.g., 'familyMembers', 'pets') */
  modelNamePlural: string;
  /** Field name linking to account (e.g., 'accountId', 'ownerId') */
  accountField: keyof T;
  /** Transform database record to API response */
  transformResponse: (item: T) => Partial<T>;
  /** Validate create/update input */
  validateInput?: (data: unknown) => T | null;
}

/**
 * Configuration for creating booking routes with care recipients.
 */
export interface BookingRouteConfig<
  TRecipient extends CareRecipientBase,
  TBooking extends CareRecipientBooking<TRecipient>
> {
  /** Care recipient field name in booking (e.g., 'familyMemberId', 'petId') */
  recipientField: keyof TBooking;
  /** Include care recipient in response */
  includeRecipient: boolean;
  /** Transform booking to API response */
  transformResponse: (booking: TBooking) => Partial<TBooking>;
}
