// Medical-specific types extending core types

import { ProviderBase, BookingBase } from '@app-booker/core';

// Medical provider (MD, DO, etc.)
export interface MedicalProvider extends ProviderBase {
  specialty: string;
  licenseNumber?: string;
  acceptsNewPatients: boolean;
  team?: string;
  languages?: string[];
}

// Patient-specific data
export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  ohipNumber?: string; // Ontario Health Insurance Plan
  rostered: boolean;
  preferredProviderId?: string;
  consentNotifications: boolean;
  canReceiveSMS: boolean;
  notificationChannel: 'email' | 'sms' | 'voice';
  languages: string[];
  chronicConditions?: string[];
  postalCode?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Medical booking extends base booking with patient reference
export interface MedicalBooking extends BookingBase {
  patientId: string;
  patient?: Patient;
  provider?: MedicalProvider;
}

// Medical appointment type
export interface MedicalAppointmentType {
  id: string;
  name: string;
  duration: number;
  description?: string;
  isActive: boolean;
  isCommon: boolean;
  requiresRostering?: boolean;
}
