/**
 * Point-of-Service (EMR) Adapter Interface
 * Defines the contract for two-way near-real-time sync with EMR systems
 */

export interface Slot {
  providerId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // minutes
  available: boolean;
}

export interface Booking {
  id?: string;
  providerId: string;
  patientId: string;
  appointmentTypeId: string;
  date: Date;
  time: string;
  modality: string;
  reason?: string;
  status: string;
}

export interface IPosAdapter {
  /**
   * Get available slots for a provider on a specific date
   */
  getProviderAvailability(providerId: string, date: string): Promise<Slot[]>;

  /**
   * Create an appointment in the PoS system
   * Returns the PoS system's booking ID
   */
  createAppointment(booking: Booking): Promise<string>;

  /**
   * Update an existing appointment
   */
  updateAppointment(id: string, updates: Partial<Booking>): Promise<void>;

  /**
   * Cancel an appointment
   */
  cancelAppointment(id: string): Promise<void>;

  /**
   * Sync appointment status from PoS to OAB
   * Called periodically to detect changes made in the EMR
   */
  syncAppointmentStatus(bookingId: string): Promise<Booking>;
}
