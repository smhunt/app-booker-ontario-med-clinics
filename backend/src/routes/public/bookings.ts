import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { BookingService } from '../../services/bookingService';
import { publicRateLimit } from '../../middleware/rateLimit';

const router = Router();
const prisma = new PrismaClient();

const createBookingSchema = z.object({
  providerId: z.string().uuid(),
  patientId: z.string().uuid().optional(),
  patientInfo: z.object({
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string(),
    email: z.string().email(),
    smsNumber: z.string().optional(),
    preferredNotification: z.enum(['email', 'sms', 'voice']),
  }).optional(),
  appointmentTypeId: z.string().uuid(),
  date: z.string().transform((str) => new Date(str)),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  modality: z.enum(['in-person', 'video', 'phone']),
  reason: z.string().optional(),
});

/**
 * POST /bookings
 * Create a new booking
 */
router.post('/', publicRateLimit, async (req, res) => {
  try {
    const data = createBookingSchema.parse(req.body);

    // Find or create patient if patientInfo is provided
    let patientId = data.patientId;

    if (!patientId && data.patientInfo) {
      const { firstName, lastName, dateOfBirth, email, smsNumber, preferredNotification } = data.patientInfo;

      // Try to find existing patient by email
      let patient = await prisma.patient.findFirst({
        where: {
          email,
        },
      });

      // Create new patient if not found
      if (!patient) {
        const fakeMrn = `TEST-${Date.now().toString().substring(-4)}`;
        patient = await prisma.patient.create({
          data: {
            name: `${firstName} ${lastName}`,
            dob: new Date(dateOfBirth),
            gender: 'unknown', // Default, can be collected in future
            fakeMrn,
            email,
            smsNumber: smsNumber || null,
            postalCode: 'N0M 2A0', // Default postal code
            rostered: false,
            consentNotifications: true,
            canReceiveSms: !!smsNumber,
            notificationChannel: preferredNotification,
            languages: ['en'],
            chronicConditions: [],
          },
        });
      }

      patientId = patient.id;
    }

    if (!patientId) {
      return res.status(400).json({
        error: 'Either patientId or patientInfo must be provided',
      });
    }

    const booking = await BookingService.createBooking({
      providerId: data.providerId,
      patientId,
      appointmentTypeId: data.appointmentTypeId,
      date: data.date,
      time: data.time,
      modality: data.modality,
      reason: data.reason,
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
      return res.status(400).json({
        error: 'Invalid booking data',
        details: error.errors,
      });
    }

    res.status(500).json({
      error: 'Failed to create booking',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /bookings/patient/:email
 * Get upcoming bookings for a patient by email
 */
router.get('/patient/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);

    // Find patient by email
    const patient = await prisma.patient.findFirst({
      where: { email },
    });

    if (!patient) {
      return res.json({ bookings: [] });
    }

    // Get upcoming bookings
    const bookings = await prisma.booking.findMany({
      where: {
        patientId: patient.id,
        status: { in: ['pending', 'confirmed'] },
        date: { gte: new Date() },
      },
      include: {
        provider: true,
        appointmentType: true,
      },
      orderBy: {
        date: 'asc',
      },
      take: 5,
    });

    res.json({
      patient: {
        name: patient.name,
        email: patient.email,
      },
      bookings: bookings.map((b) => ({
        id: b.id,
        date: b.date,
        time: b.time,
        modality: b.modality,
        status: b.status,
        provider: {
          name: b.provider.displayName,
        },
        appointmentType: {
          name: b.appointmentType.name,
          duration: b.appointmentType.duration,
        },
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch bookings',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /bookings/:id
 * Get booking details
 */
router.get('/:id', async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        provider: true,
        patient: true,
        appointmentType: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      booking: {
        id: booking.id,
        date: booking.date,
        time: booking.time,
        modality: booking.modality,
        status: booking.status,
        reason: booking.reason,
        provider: {
          name: booking.provider.displayName,
          specialty: booking.provider.specialty,
        },
        appointmentType: {
          name: booking.appointmentType.name,
          duration: booking.appointmentType.duration,
        },
        createdAt: booking.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch booking',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /bookings/:id
 * Cancel a booking
 */
router.delete('/:id', async (req, res) => {
  try {
    const cancellationReason = req.body.reason;

    const booking = await BookingService.cancelBooking(
      req.params.id,
      cancellationReason
    );

    res.json({
      message: 'Booking cancelled successfully',
      booking: {
        id: booking.id,
        status: booking.status,
        cancellationReason: booking.cancellationReason,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to cancel booking',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
