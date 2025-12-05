import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { BookingService } from '../../services/bookingService';
import { requirePatientWithInfo, getPatientFromClerk } from '../../middleware/clerkAuth';
import logger from '../../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// All routes require Clerk patient authentication
router.use(requirePatientWithInfo);

const createBookingSchema = z.object({
  providerId: z.string().uuid(),
  appointmentTypeId: z.string().uuid(),
  date: z.string().transform((str) => new Date(str)),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  modality: z.enum(['in-person', 'video', 'phone']),
  reason: z.string().optional(),
  patientInfo: z.object({
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string(),
    email: z.string().email(),
    smsNumber: z.string().optional(),
    preferredNotification: z.enum(['email', 'sms', 'voice']),
  }),
});

/**
 * GET /patient/bookings
 * Get all bookings for the authenticated patient
 */
router.get('/bookings', async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkPatient = getPatientFromClerk(req);

    if (!clerkPatient?.email) {
      res.status(400).json({ error: 'Patient email not found' });
      return;
    }

    // Find patient by email or clerkUserId
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { clerkUserId: clerkPatient.clerkUserId },
          { email: clerkPatient.email },
        ],
      },
    });

    if (!patient) {
      res.json({ bookings: [] });
      return;
    }

    // Get all bookings (upcoming and past)
    const bookings = await prisma.booking.findMany({
      where: {
        patientId: patient.id,
      },
      include: {
        provider: true,
        appointmentType: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    res.json({
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
      },
      bookings: bookings.map((b) => ({
        id: b.id,
        date: b.date,
        time: b.time,
        modality: b.modality,
        status: b.status,
        reason: b.reason,
        provider: {
          name: b.provider.displayName,
        },
        appointmentType: {
          name: b.appointmentType.name,
          duration: b.appointmentType.duration,
        },
        createdAt: b.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch patient bookings', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to fetch bookings',
    });
  }
});

/**
 * POST /patient/bookings
 * Create a new booking for the authenticated patient
 */
router.post('/bookings', async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkPatient = getPatientFromClerk(req);

    if (!clerkPatient?.clerkUserId) {
      res.status(400).json({ error: 'Patient authentication required' });
      return;
    }

    const data = createBookingSchema.parse(req.body);
    const { firstName, lastName, dateOfBirth, email, smsNumber, preferredNotification } = data.patientInfo;

    // Find or create patient linked to Clerk user
    let patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { clerkUserId: clerkPatient.clerkUserId },
          { email: email },
        ],
      },
    });

    if (patient && !patient.clerkUserId) {
      // Link existing patient to Clerk user
      patient = await prisma.patient.update({
        where: { id: patient.id },
        data: { clerkUserId: clerkPatient.clerkUserId },
      });
    } else if (!patient) {
      // Create new patient
      const fakeMrn = `TEST-${Date.now().toString().substring(8)}`;
      patient = await prisma.patient.create({
        data: {
          name: `${firstName} ${lastName}`,
          dob: new Date(dateOfBirth),
          gender: 'unknown',
          fakeMrn,
          email,
          smsNumber: smsNumber || null,
          postalCode: 'N0M 2A0',
          rostered: false,
          consentNotifications: true,
          canReceiveSms: !!smsNumber,
          notificationChannel: preferredNotification,
          languages: ['en'],
          chronicConditions: [],
          clerkUserId: clerkPatient.clerkUserId,
        },
      });
    }

    const booking = await BookingService.createBooking({
      providerId: data.providerId,
      patientId: patient.id,
      appointmentTypeId: data.appointmentTypeId,
      date: data.date,
      time: data.time,
      modality: data.modality,
      reason: data.reason,
    });

    logger.info('Patient booking created via Clerk auth', {
      bookingId: booking.id,
      clerkUserId: clerkPatient.clerkUserId,
    });

    res.status(201).json({
      booking: {
        id: booking.id,
        providerId: booking.providerId,
        patientId: booking.patientId,
        date: booking.date,
        time: booking.time,
        modality: booking.modality,
        status: booking.status,
        provider: {
          name: booking.provider.displayName,
        },
        appointmentType: {
          name: booking.appointmentType.name,
          duration: booking.appointmentType.duration,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid booking data',
        details: error.errors,
      });
      return;
    }

    logger.error('Failed to create patient booking', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to create booking',
    });
  }
});

/**
 * DELETE /patient/bookings/:id
 * Cancel a booking owned by the authenticated patient
 */
router.delete('/bookings/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkPatient = getPatientFromClerk(req);
    const bookingId = req.params.id;
    const cancellationReason = req.body.reason;

    if (!clerkPatient?.clerkUserId) {
      res.status(400).json({ error: 'Patient authentication required' });
      return;
    }

    // Find the booking and verify ownership
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { patient: true },
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    // Verify the booking belongs to this patient
    const isOwner =
      booking.patient.clerkUserId === clerkPatient.clerkUserId ||
      booking.patient.email === clerkPatient.email;

    if (!isOwner) {
      res.status(403).json({ error: 'Not authorized to cancel this booking' });
      return;
    }

    const cancelledBooking = await BookingService.cancelBooking(
      bookingId,
      cancellationReason || 'Cancelled by patient'
    );

    logger.info('Patient booking cancelled via Clerk auth', {
      bookingId: cancelledBooking.id,
      clerkUserId: clerkPatient.clerkUserId,
    });

    res.json({
      message: 'Booking cancelled successfully',
      booking: {
        id: cancelledBooking.id,
        status: cancelledBooking.status,
      },
    });
  } catch (error) {
    logger.error('Failed to cancel patient booking', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to cancel booking',
    });
  }
});

export default router;
