// API Types

export interface Provider {
  id: string;
  fullName: string;
  credentials: string;
  team?: string;
  photoUrl?: string;
  workingHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
  };
  clinic?: Clinic;
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
}

export interface AppointmentType {
  id: string;
  name: string;
  duration: number;
  description?: string;
  isCommon?: boolean;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface Booking {
  id: string;
  providerId: string;
  patientId?: string;
  appointmentTypeId: string;
  date: string;
  time: string;
  modality: 'in-person' | 'video' | 'phone';
  status: 'pending' | 'approved' | 'confirmed' | 'declined' | 'cancelled' | 'completed';
  reason?: string;
  provider?: {
    name: string;
    specialty?: string;
  };
  appointmentType?: {
    name: string;
    duration: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBookingRequest {
  providerId: string;
  appointmentTypeId: string;
  date: string;
  time: string;
  modality: 'in-person' | 'video' | 'phone';
  patientInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    email: string;
    smsNumber?: string;
    preferredNotification: 'email' | 'sms' | 'voice';
  };
  reason?: string;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'staff';
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  payload?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface ApiError {
  error: string;
  message?: string;
  details?: unknown;
}

// Family Member types (Account → CareRecipient model)
export type FamilyRelationship =
  | 'self'
  | 'child'
  | 'spouse'
  | 'parent'
  | 'sibling'
  | 'grandparent'
  | 'guardian'
  | 'other';

export interface FamilyMember {
  id: string;
  name: string;
  dateOfBirth: string;
  relationship: FamilyRelationship;
  gender: 'male' | 'female' | 'nonbinary' | 'prefer_not_to_say';
  postalCode?: string;
  chronicConditions: string[];
  allergies: string[];
  canSelfConsent: boolean;
  createdAt?: string;
}

export interface PatientAccount {
  id: string;
  email: string;
  name: string;
}

export interface CreateFamilyMemberRequest {
  name: string;
  dateOfBirth: string;
  relationship: FamilyRelationship;
  gender: 'male' | 'female' | 'nonbinary' | 'prefer_not_to_say';
  healthCardNumber?: string;
  postalCode?: string;
  chronicConditions?: string[];
  allergies?: string[];
  canSelfConsent?: boolean;
}

export interface FamilyMemberBooking {
  id: string;
  date: string;
  time: string;
  modality: 'in-person' | 'video' | 'phone';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  reason?: string;
  notes?: string;
  familyMember: {
    id: string;
    name: string;
    relationship: FamilyRelationship;
  };
  provider?: {
    id: string;
    name: string;
    specialty?: string;
  };
  appointmentType?: {
    id: string;
    name: string;
    duration: number;
  };
  createdAt?: string;
}

export interface CreateFamilyMemberBookingRequest {
  familyMemberId: string;
  providerId: string;
  appointmentTypeId: string;
  date: string;
  time: string;
  modality: 'in-person' | 'video' | 'phone';
  reason?: string;
  notes?: string;
}
