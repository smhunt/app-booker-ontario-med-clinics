// Veterinary-specific types

import { ProviderBase, BookingBase } from '@app-booker/core';

// Veterinarian (DVM, VMD, etc.)
export interface Veterinarian extends ProviderBase {
  specialty: string; // "Small Animal", "Large Animal", "Exotic", "Surgery"
  licenseNumber?: string;
  acceptsNewClients: boolean;
  team?: string;
  languages?: string[];
}

// Pet Owner (PIPEDA applies, not PHIPA)
export interface PetOwner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  consentNotifications: boolean;
  canReceiveSMS: boolean;
  notificationChannel: 'email' | 'sms' | 'voice';
  languages: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Pet (the "patient" in veterinary context)
export interface Pet {
  id: string;
  name: string;
  species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'reptile' | 'other';
  breed?: string;
  dateOfBirth?: Date;
  sex?: 'male' | 'female' | 'neutered_male' | 'spayed_female';
  weight?: number; // in kg
  microchipNumber?: string;
  allergies?: string[];
  chronicConditions?: string[];
  ownerId: string;
  owner?: PetOwner;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Veterinary booking extends base booking with pet reference
export interface VeterinaryBooking extends BookingBase {
  petId: string;
  veterinarianId: string;
  pet?: Pet;
  veterinarian?: Veterinarian;
}

// Veterinary appointment type
export interface VeterinaryAppointmentType {
  id: string;
  name: string; // "Wellness Exam", "Vaccination", "Surgery", "Grooming", "Boarding"
  duration: number;
  description?: string;
  isActive: boolean;
  isCommon: boolean;
  requiresSpecies?: string[]; // Species-specific appointment types
}

// Common veterinary appointment type names
export const VET_APPOINTMENT_TYPES = {
  WELLNESS_EXAM: 'Wellness Exam',
  VACCINATION: 'Vaccination',
  DENTAL_CLEANING: 'Dental Cleaning',
  SURGERY: 'Surgery',
  GROOMING: 'Grooming',
  BOARDING_CHECKIN: 'Boarding Check-in',
  BOARDING_CHECKOUT: 'Boarding Check-out',
  EMERGENCY: 'Emergency Visit',
  FOLLOW_UP: 'Follow-up',
  SPAY_NEUTER: 'Spay/Neuter',
  MICROCHIPPING: 'Microchipping',
  NAIL_TRIM: 'Nail Trim',
  DIAGNOSTIC: 'Diagnostic Imaging',
  LAB_WORK: 'Lab Work',
  CONSULTATION: 'Consultation',
} as const;

// Common pet species
export const PET_SPECIES = {
  DOG: 'dog',
  CAT: 'cat',
  BIRD: 'bird',
  RABBIT: 'rabbit',
  REPTILE: 'reptile',
  HAMSTER: 'hamster',
  GUINEA_PIG: 'guinea_pig',
  FERRET: 'ferret',
  HORSE: 'horse',
  OTHER: 'other',
} as const;
