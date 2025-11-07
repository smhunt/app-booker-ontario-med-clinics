import { IPosAdapter, Slot, Booking } from './IPosAdapter';
import logger from '../../utils/logger';

/**
 * FHIR PoS Adapter (Stub for Future Implementation)
 *
 * TODO(integration): Implement FHIR R4 integration with actual EMR
 * TODO(security): Obtain vendor credentials and complete security review
 *
 * Resources to map:
 * - FHIR Appointment: https://www.hl7.org/fhir/appointment.html
 * - FHIR Slot: https://www.hl7.org/fhir/slot.html
 * - FHIR Schedule: https://www.hl7.org/fhir/schedule.html
 */
export class FhirPosAdapter implements IPosAdapter {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.FHIR_BASE_URL || 'http://localhost:8090/fhir';
    logger.warn('FhirPosAdapter initialized (STUB ONLY - not functional)');
  }

  async getProviderAvailability(providerId: string, date: string): Promise<Slot[]> {
    logger.warn('FhirPosAdapter.getProviderAvailability called (stub)', {
      providerId,
      date,
    });

    throw new Error(
      'FhirPosAdapter not implemented. Use MockPosAdapter or complete FHIR integration.'
    );
  }

  async createAppointment(booking: Booking): Promise<string> {
    logger.warn('FhirPosAdapter.createAppointment called (stub)', {
      bookingId: booking.id,
    });

    throw new Error(
      'FhirPosAdapter not implemented. Use MockPosAdapter or complete FHIR integration.'
    );
  }

  async updateAppointment(id: string, updates: Partial<Booking>): Promise<void> {
    logger.warn('FhirPosAdapter.updateAppointment called (stub)', { id });

    throw new Error(
      'FhirPosAdapter not implemented. Use MockPosAdapter or complete FHIR integration.'
    );
  }

  async cancelAppointment(id: string): Promise<void> {
    logger.warn('FhirPosAdapter.cancelAppointment called (stub)', { id });

    throw new Error(
      'FhirPosAdapter not implemented. Use MockPosAdapter or complete FHIR integration.'
    );
  }

  async syncAppointmentStatus(bookingId: string): Promise<Booking> {
    logger.warn('FhirPosAdapter.syncAppointmentStatus called (stub)', {
      bookingId,
    });

    throw new Error(
      'FhirPosAdapter not implemented. Use MockPosAdapter or complete FHIR integration.'
    );
  }
}
