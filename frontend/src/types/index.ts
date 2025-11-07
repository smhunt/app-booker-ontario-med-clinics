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
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  reason?: string;
  provider?: Provider;
  appointmentType?: AppointmentType;
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
