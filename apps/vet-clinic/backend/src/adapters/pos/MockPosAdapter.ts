import { IPosAdapter, Slot, Appointment } from './IPosAdapter';
import logger from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mock PoS Adapter
 * Simulates veterinary practice management system for development and testing
 */
export class MockPosAdapter implements IPosAdapter {
  private appointments: Map<string, Appointment> = new Map();

  /**
   * Get mock availability - generates standard clinic hours slots
   */
  async getVeterinarianAvailability(veterinarianId: string, date: string): Promise<Slot[]> {
    logger.info('MockPosAdapter: Getting availability', { veterinarianId, date });

    const slots: Slot[] = [];
    const morningHours = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
    const afternoonHours = ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];

    [...morningHours, ...afternoonHours].forEach((time) => {
      // Randomly mark some slots as unavailable for realism
      const available = Math.random() > 0.3;
      slots.push({
        time,
        available,
        duration: 30,
      });
    });

    return slots;
  }

  /**
   * Create mock appointment
   */
  async createAppointment(appointment: Appointment): Promise<string> {
    const externalId = `VET-${uuidv4().substring(0, 8)}`;

    this.appointments.set(appointment.id, appointment);

    logger.info('MockPosAdapter: Created appointment', {
      internalId: appointment.id,
      externalId,
      veterinarianId: appointment.veterinarianId,
      date: appointment.date,
    });

    return externalId;
  }

  /**
   * Update mock appointment
   */
  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<void> {
    const existing = this.appointments.get(id);
    if (existing) {
      this.appointments.set(id, { ...existing, ...updates });
    }

    logger.info('MockPosAdapter: Updated appointment', { id, updates });
  }

  /**
   * Cancel mock appointment
   */
  async cancelAppointment(id: string): Promise<void> {
    const existing = this.appointments.get(id);
    if (existing) {
      this.appointments.set(id, { ...existing, status: 'cancelled' });
    }

    logger.info('MockPosAdapter: Cancelled appointment', { id });
  }
}
