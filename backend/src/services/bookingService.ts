import { PrismaClient } from '@prisma/client';
import { createPosAdapter } from '../adapters/factory';
import { createNotificationAdapter } from '../adapters/factory';
import { AuditService } from './auditService';
import logger from '../utils/logger';

const prisma = new PrismaClient();
const posAdapter = createPosAdapter();
const notificationAdapter = createNotificationAdapter();

export interface CreateBookingData {
  providerId: string;
  patientId: string;
  appointmentTypeId: string;
  date: Date;
  time: string;
  modality: string;
  reason?: string;
}

/**
 * Booking Service
 * Handles appointment booking logic and coordinates with PoS and notifications
 */
export class BookingService {
  /**
   * Create a new booking
   */
  static async createBooking(data: CreateBookingData, userId?: string) {
    logger.info('Creating booking', {
      providerId: data.providerId,
      patientId: data.patientId,
      date: data.date,
    });

    // Create booking in database
    const booking = await prisma.booking.create({
      data: {
        providerId: data.providerId,
        patientId: data.patientId,
        appointmentTypeId: data.appointmentTypeId,
        date: data.date,
        time: data.time,
        modality: data.modality,
        reason: data.reason,
        status: 'pending',
      },
      include: {
        provider: true,
        patient: true,
        appointmentType: true,
      },
    });

    // Sync to PoS system
    try {
      const posId = await posAdapter.createAppointment({
        id: booking.id,
        providerId: booking.providerId,
        patientId: booking.patientId,
        appointmentTypeId: booking.appointmentTypeId,
        date: booking.date,
        time: booking.time,
        modality: booking.modality,
        reason: booking.reason,
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
      payload: { providerId: data.providerId, date: data.date, time: data.time },
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
        cancellationReason,
      },
      include: {
        provider: true,
        patient: true,
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
   * Send booking confirmation
   */
  private static async sendConfirmation(booking: any) {
    const patient = booking.patient;
    const provider = booking.provider;
    const appointmentType = booking.appointmentType;

    const message = `Your appointment with ${provider.displayName} is confirmed for ${booking.date.toLocaleDateString()} at ${booking.time}. Type: ${appointmentType.name}. Booking ID: ${booking.id}`;

    switch (patient.notificationChannel) {
      case 'email':
        await notificationAdapter.sendEmail({
          to: patient.email,
          subject: 'Appointment Confirmation',
          template: 'booking-confirmation',
          data: {
            patientName: patient.name,
            providerName: provider.displayName,
            date: booking.date.toLocaleDateString(),
            time: booking.time,
            type: appointmentType.name,
            bookingId: booking.id,
          },
        });
        break;
      case 'sms':
        if (patient.canReceiveSms && patient.smsNumber) {
          await notificationAdapter.sendSMS({
            to: patient.smsNumber,
            message,
          });
        }
        break;
      case 'voice':
        if (patient.smsNumber) {
          await notificationAdapter.sendVoice({
            to: patient.smsNumber,
            script: message,
          });
        }
        break;
    }
  }

  /**
   * Send cancellation notification
   */
  private static async sendCancellation(booking: any) {
    const patient = booking.patient;
    const message = `Your appointment on ${booking.date.toLocaleDateString()} at ${booking.time} has been cancelled. Booking ID: ${booking.id}`;

    switch (patient.notificationChannel) {
      case 'email':
        await notificationAdapter.sendEmail({
          to: patient.email,
          subject: 'Appointment Cancelled',
          template: 'booking-cancellation',
          data: {
            patientName: patient.name,
            date: booking.date.toLocaleDateString(),
            time: booking.time,
            bookingId: booking.id,
          },
        });
        break;
      case 'sms':
        if (patient.canReceiveSms && patient.smsNumber) {
          await notificationAdapter.sendSMS({
            to: patient.smsNumber,
            message,
          });
        }
        break;
    }
  }

  /**
   * Get available slots for a provider on a specific date
   */
  static async getAvailability(providerId: string, date: string) {
    // Get slots from PoS
    const slots = await posAdapter.getProviderAvailability(providerId, date);

    // Filter out slots that are already booked in our system
    const existingBookings = await prisma.booking.findMany({
      where: {
        providerId,
        date: new Date(date),
        status: { in: ['pending', 'confirmed'] },
      },
    });

    const bookedTimes = new Set(existingBookings.map((b) => b.time));

    return slots.filter((slot) => !bookedTimes.has(slot.time));
  }
}
