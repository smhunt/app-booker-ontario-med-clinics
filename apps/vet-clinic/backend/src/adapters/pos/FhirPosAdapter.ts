import { IPosAdapter, Slot, Appointment } from './IPosAdapter';
import logger from '../../utils/logger';

/**
 * FHIR PoS Adapter (Stub)
 * Future integration with FHIR-compliant veterinary systems
 *
 * TODO(integration): Implement real FHIR client when vendor credentials are available
 */
export class FhirPosAdapter implements IPosAdapter {
  constructor() {
    logger.warn('FhirPosAdapter: Using stub implementation - not connected to real FHIR server');
  }

  async getVeterinarianAvailability(veterinarianId: string, date: string): Promise<Slot[]> {
    logger.info('FhirPosAdapter: getVeterinarianAvailability (stub)', { veterinarianId, date });

    // Return empty slots - stub implementation
    return [];
  }

  async createAppointment(appointment: Appointment): Promise<string> {
    logger.info('FhirPosAdapter: createAppointment (stub)', { id: appointment.id });

    // Return mock ID
    return `FHIR-STUB-${appointment.id}`;
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<void> {
    logger.info('FhirPosAdapter: updateAppointment (stub)', { id, updates });
  }

  async cancelAppointment(id: string): Promise<void> {
    logger.info('FhirPosAdapter: cancelAppointment (stub)', { id });
  }
}
