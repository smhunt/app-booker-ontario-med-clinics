// Veterinary Clinic Types

export interface Veterinarian {
  id: string;
  name: string;
  displayName: string | null;
  specialty: string;
  team: string | null;
  acceptsNewClients: boolean;
  languages: string[];
}

export interface PetOwner {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  dateOfBirth: string | null;
  sex: string | null;
  weight: number | null;
  allergies: string[];
  chronicConditions: string[];
}

export interface AppointmentType {
  id: string;
  name: string;
  duration: number;
  description: string | null;
  isCommon: boolean;
  requiresSpecies: string[];
}

export interface TimeSlot {
  time: string;
  available: boolean;
  duration: number;
}

export interface Booking {
  id: string;
  date: string;
  time: string;
  modality: 'in-person' | 'video' | 'phone';
  status: 'pending' | 'approved' | 'confirmed' | 'cancelled' | 'completed' | 'declined';
  reason: string | null;
  pet: {
    id?: string;
    name: string;
    species: string;
    breed?: string | null;
  };
  veterinarian: {
    id?: string;
    name: string;
    specialty?: string;
  };
  owner?: {
    id: string;
    name: string;
    email: string | null;
  };
  appointmentType: {
    name: string;
    duration: number;
  };
  createdAt?: string;
}

export interface CreateBookingRequest {
  veterinarianId: string;
  petId?: string;
  ownerInfo?: {
    name: string;
    email: string;
    phone?: string;
    preferredNotification: 'email' | 'sms' | 'voice';
  };
  petInfo?: {
    name: string;
    species: string;
    breed?: string;
    dateOfBirth?: string;
    sex?: string;
  };
  appointmentTypeId: string;
  date: string;
  time: string;
  modality: 'in-person' | 'video' | 'phone';
  reason?: string;
}

export interface CreatePetRequest {
  name: string;
  species: string;
  breed?: string;
  dateOfBirth?: string;
  sex?: string;
  weight?: number;
  microchipNumber?: string;
  allergies?: string[];
  chronicConditions?: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'clinic_staff';
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
  userId: string | null;
  userRole?: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  timestamp: string;
  details: Record<string, unknown> | null;
}

export interface ApiError {
  error: string;
  message?: string;
  details?: any;
}
