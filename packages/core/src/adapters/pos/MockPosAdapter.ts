import { IPosAdapter, Slot, Booking } from './IPosAdapter';
import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger';

/**
 * Mock PoS Adapter for Testing and Development
 * Simulates EMR integration without actual external calls
 */
export class MockPosAdapter implements IPosAdapter {
  private mockBookings: Map<string, Booking> = new Map();
  private prisma = new PrismaClient();

  async getProviderAvailability(providerId: string, date: string): Promise<Slot[]> {
    logger.info('MockPosAdapter: Getting availability', { providerId, date });

    // Get provider with working hours and OAB windows
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return [];
    }

    // Determine day of week from date
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Get OAB windows for this provider and day
    const oabWindows = await this.prisma.oabWindow.findMany({
      where: {
        providerId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (oabWindows.length === 0) {
      logger.info('No OAB windows for provider on this day', { providerId, dayOfWeek });
      return [];
    }

    // Generate slots based on OAB windows
    const slots: Slot[] = [];
    const slotDuration = 15;

    for (const window of oabWindows) {
      const [startHour, startMinute] = window.startTime.split(':').map(Number);
      const [endHour, endMinute] = window.endTime.split(':').map(Number);

      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
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

    logger.info('Generated slots', { providerId, date, count: slots.length });
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
