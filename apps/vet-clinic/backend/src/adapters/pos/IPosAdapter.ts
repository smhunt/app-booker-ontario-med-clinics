/**
 * Point of Service (EMR) Adapter Interface
 * Two-way sync with veterinary practice management systems
 */

export interface Slot {
  time: string;
  available: boolean;
  duration: number;
}

export interface Appointment {
  id: string;
  veterinarianId: string;
  petId: string;
  appointmentTypeId: string;
  date: Date | string;
  time: string;
  modality: string;
  reason?: string;
  status: string;
}

export interface IPosAdapter {
  /**
   * Get available appointment slots for a veterinarian on a specific date
   */
  getVeterinarianAvailability(veterinarianId: string, date: string): Promise<Slot[]>;

  /**
   * Create an appointment in the PoS system
   * Returns the external appointment ID
   */
  createAppointment(appointment: Appointment): Promise<string>;

  /**
   * Update an existing appointment
   */
  updateAppointment(id: string, updates: Partial<Appointment>): Promise<void>;

  /**
   * Cancel an appointment
   */
  cancelAppointment(id: string): Promise<void>;
}
