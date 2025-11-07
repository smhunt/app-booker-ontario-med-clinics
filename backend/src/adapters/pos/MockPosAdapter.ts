import { IPosAdapter, Slot, Booking } from './IPosAdapter';
import logger from '../../utils/logger';

/**
 * Mock PoS Adapter for Testing and Development
 * Simulates EMR integration without actual external calls
 */
export class MockPosAdapter implements IPosAdapter {
  private mockBookings: Map<string, Booking> = new Map();

  async getProviderAvailability(providerId: string, date: string): Promise<Slot[]> {
    logger.info('MockPosAdapter: Getting availability', { providerId, date });

    // Generate mock availability slots
    const slots: Slot[] = [];
    const startHour = 9;
    const endHour = 16;
    const slotDuration = 15;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        // Randomly mark some slots as unavailable (simulating existing bookings)
        const available = Math.random() > 0.3;

        slots.push({
          providerId,
          date,
          time,
          duration: slotDuration,
          available,
        });
      }
    }

    return slots;
  }

  async createAppointment(booking: Booking): Promise<string> {
    const mockPosId = `POS-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    logger.info('MockPosAdapter: Creating appointment', {
      bookingId: booking.id,
      posId: mockPosId,
      providerId: booking.providerId,
      date: booking.date,
    });

    // Store in mock database
    this.mockBookings.set(mockPosId, { ...booking, id: mockPosId });

    return mockPosId;
  }

  async updateAppointment(id: string, updates: Partial<Booking>): Promise<void> {
    logger.info('MockPosAdapter: Updating appointment', { id, updates });

    const existing = this.mockBookings.get(id);
    if (existing) {
      this.mockBookings.set(id, { ...existing, ...updates });
    }
  }

  async cancelAppointment(id: string): Promise<void> {
    logger.info('MockPosAdapter: Cancelling appointment', { id });

    const existing = this.mockBookings.get(id);
    if (existing) {
      this.mockBookings.set(id, { ...existing, status: 'cancelled' });
    }
  }

  async syncAppointmentStatus(bookingId: string): Promise<Booking> {
    logger.info('MockPosAdapter: Syncing appointment status', { bookingId });

    const booking = this.mockBookings.get(bookingId);
    if (!booking) {
      throw new Error(`Booking not found in PoS: ${bookingId}`);
    }

    return booking;
  }
}
