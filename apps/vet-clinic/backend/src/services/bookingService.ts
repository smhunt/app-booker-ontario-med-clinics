import { PrismaClient } from '../generated/prisma';
import { createPosAdapter } from '../adapters/factory';
import { createNotificationAdapter } from '../adapters/factory';
import { AuditService } from './auditService';
import logger from '../utils/logger';

const prisma = new PrismaClient();
const posAdapter = createPosAdapter();
const notificationAdapter = createNotificationAdapter();

export interface CreateBookingData {
  veterinarianId: string;
  petId: string;
  appointmentTypeId: string;
  date: Date;
  time: string;
  modality: string;
  reason?: string;
}

/**
 * Veterinary Booking Service
 * Handles appointment booking logic and coordinates with PoS and notifications
 */
export class BookingService {
  /**
   * Create a new booking
   */
  static async createBooking(data: CreateBookingData, userId?: string) {
    logger.info('Creating veterinary booking', {
      veterinarianId: data.veterinarianId,
      petId: data.petId,
      date: data.date,
    });

    // Create booking in database
    const booking = await prisma.booking.create({
      data: {
        veterinarianId: data.veterinarianId,
        petId: data.petId,
        appointmentTypeId: data.appointmentTypeId,
        date: data.date instanceof Date ? data.date.toISOString().split('T')[0] : data.date,
        time: data.time,
        modality: data.modality,
        reason: data.reason,
        status: 'approved', // Auto-approve for vet clinic
      },
      include: {
        veterinarian: true,
        pet: {
          include: {
            owner: true,
          },
        },
        appointmentType: true,
      },
    });

    // Sync to PoS system
    try {
      const posId = await posAdapter.createAppointment({
        id: booking.id,
        veterinarianId: booking.veterinarianId,
        petId: booking.petId,
        appointmentTypeId: booking.appointmentTypeId,
        date: booking.date,
        time: booking.time,
        modality: booking.modality,
        reason: booking.reason || undefined,
        status: booking.status,
      });

      logger.info('Booking synced to PoS', { bookingId: booking.id, posId });
    } catch (error) {
      logger.error('Failed to sync booking to PoS', {
        bookingId: booking.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Send confirmation notification
    try {
      await this.sendConfirmation(booking);
    } catch (error) {
      logger.error('Failed to send confirmation', {
        bookingId: booking.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Audit log
    await AuditService.log({
      userId,
      action: 'create_booking',
      resource: 'booking',
      resourceId: booking.id,
      payload: { veterinarianId: data.veterinarianId, petId: data.petId, date: data.date, time: data.time },
    });

    return booking;
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(
    bookingId: string,
    cancellationReason?: string,
    userId?: string
  ) {
    logger.info('Cancelling booking', { bookingId });

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
        reason: cancellationReason,
      },
      include: {
        veterinarian: true,
        pet: {
          include: {
            owner: true,
          },
        },
      },
    });

    // Sync to PoS
    try {
      await posAdapter.cancelAppointment(bookingId);
    } catch (error) {
      logger.error('Failed to cancel booking in PoS', {
        bookingId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Send cancellation notification
    try {
      await this.sendCancellation(booking);
    } catch (error) {
      logger.error('Failed to send cancellation notification', {
        bookingId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Audit log
    await AuditService.log({
      userId,
      action: 'cancel_booking',
      resource: 'booking',
      resourceId: bookingId,
      payload: { cancellationReason },
    });

    return booking;
  }

  /**
   * Send booking confirmation to pet owner
   */
  private static async sendConfirmation(booking: any) {
    const owner = booking.pet.owner;
    const vet = booking.veterinarian;
    const pet = booking.pet;
    const appointmentType = booking.appointmentType;

    const message = `Appointment confirmed for ${pet.name} with ${vet.displayName || vet.name} on ${booking.date} at ${booking.time}. Type: ${appointmentType.name}. Booking ID: ${booking.id}`;

    switch (owner.notificationChannel) {
      case 'email':
        if (owner.email) {
          await notificationAdapter.sendEmail({
            to: owner.email,
            subject: `Appointment Confirmed for ${pet.name}`,
            template: 'vet-booking-confirmation',
            data: {
              ownerName: owner.name,
              petName: pet.name,
              vetName: vet.displayName || vet.name,
              date: booking.date,
              time: booking.time,
              type: appointmentType.name,
              bookingId: booking.id,
            },
          });
        }
        break;
      case 'sms':
        if (owner.canReceiveSMS && owner.phone) {
          await notificationAdapter.sendSMS({
            to: owner.phone,
            message,
          });
        }
        break;
      case 'voice':
        if (owner.phone) {
          await notificationAdapter.sendVoice({
            to: owner.phone,
            script: message,
          });
        }
        break;
    }
  }

  /**
   * Send cancellation notification to pet owner
   */
  private static async sendCancellation(booking: any) {
    const owner = booking.pet.owner;
    const pet = booking.pet;
    const message = `Your appointment for ${pet.name} on ${booking.date} at ${booking.time} has been cancelled. Booking ID: ${booking.id}`;

    switch (owner.notificationChannel) {
      case 'email':
        if (owner.email) {
          await notificationAdapter.sendEmail({
            to: owner.email,
            subject: `Appointment Cancelled for ${pet.name}`,
            template: 'vet-booking-cancellation',
            data: {
              ownerName: owner.name,
              petName: pet.name,
              date: booking.date,
              time: booking.time,
              bookingId: booking.id,
            },
          });
        }
        break;
      case 'sms':
        if (owner.canReceiveSMS && owner.phone) {
          await notificationAdapter.sendSMS({
            to: owner.phone,
            message,
          });
        }
        break;
    }
  }

  /**
   * Get available slots for a veterinarian on a specific date
   */
  static async getAvailability(veterinarianId: string, date: string) {
    // Get slots from PoS
    const slots = await posAdapter.getVeterinarianAvailability(veterinarianId, date);

    // Filter out slots that are already booked in our system
    const existingBookings = await prisma.booking.findMany({
      where: {
        veterinarianId,
        date,
        status: { in: ['pending', 'approved', 'confirmed'] },
      },
    });

    const bookedTimes = new Set(existingBookings.map((b) => b.time));

    return slots.filter((slot) => !bookedTimes.has(slot.time));
  }
}
