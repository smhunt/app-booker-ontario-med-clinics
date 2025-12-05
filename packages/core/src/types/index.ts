// Shared types across all industries

import { Request } from 'express';

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'clinic_staff' | 'patient' | 'pet_owner' | 'veterinarian';
  name: string;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Booking-related types (industry-agnostic)
export interface BookingBase {
  id: string;
  providerId: string;
  appointmentTypeId: string;
  date: string;
  time: string;
  modality: 'in-person' | 'video' | 'phone';
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  reason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Audit log types
export interface AuditLogEntry {
  id: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  timestamp: Date;
  ipAddress?: string;
  details?: Record<string, any>;
}

// Slot availability (shared across industries)
export interface Slot {
  date: string;
  time: string;
  available: boolean;
  duration: number;
  modality?: 'in-person' | 'video' | 'phone';
}

// Provider base interface (DVM, MD, etc.)
export interface ProviderBase {
  id: string;
  name: string;
  displayName?: string;
  specialty?: string;
  isActive: boolean;
}

// Appointment type base
export interface AppointmentTypeBase {
  id: string;
  name: string;
  duration: number;
  description?: string;
  isActive: boolean;
  isCommon?: boolean;
}

export type { Request };
