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
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a new booking
 *     description: Book an appointment with a provider. Can use existing patient ID or create new patient with patientInfo.
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *               - appointmentTypeId
 *               - date
 *               - time
 *               - modality
 *             properties:
 *               providerId:
 *                 type: string
 *                 format: uuid
 *               patientId:
 *                 type: string
 *                 format: uuid
 *                 description: Existing patient ID (optional if patientInfo provided)
 *               patientInfo:
 *                 type: object
 *                 description: New patient information (required if patientId not provided)
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   dateOfBirth:
 *                     type: string
 *                     format: date
 *                   email:
 *                     type: string
 *                     format: email
 *                   smsNumber:
 *                     type: string
 *                   preferredNotification:
 *                     type: string
 *                     enum: [email, sms, voice]
 *               appointmentTypeId:
 *                 type: string
 *                 format: uuid
 *               date:
 *                 type: string
 *                 format: date
 *               time:
 *                 type: string
 *                 pattern: '^\d{2}:\d{2}$'
 *                 example: "09:30"
 *               modality:
 *                 type: string
 *                 enum: [in-person, video, phone]
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 booking:
 *                   $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Invalid booking data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       500:
 *         description: Server error
 */
router.post('/', publicRateLimit, async (req, res): Promise<void> => {
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
      res.status(400).json({
        error: 'Either patientId or patientInfo must be provided',
      });
      return;
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
      res.status(400).json({
        error: 'Invalid booking data',
        details: error.errors,
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to create booking',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /bookings/patient/{email}:
 *   get:
 *     summary: Get patient bookings by email
 *     description: Returns upcoming bookings for a patient identified by email
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Patient email (URL encoded)
 *     responses:
 *       200:
 *         description: Patient bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 patient:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *       500:
 *         description: Server error
 */
router.get('/patient/:email', async (req, res): Promise<void> => {
  try {
    const email = decodeURIComponent(req.params.email);

    // Find patient by email
    const patient = await prisma.patient.findFirst({
      where: { email },
    });

    if (!patient) {
      res.json({ bookings: [] });
      return;
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
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     description: Returns details for a specific booking
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 booking:
 *                   $ref: '#/components/schemas/Booking'
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res): Promise<void> => {
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
      res.status(404).json({ error: 'Booking not found' });
      return;
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
 * @swagger
 * /bookings/{id}:
 *   delete:
 *     summary: Cancel a booking
 *     description: Cancels an existing booking
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Cancellation reason
 *     responses:
 *       200:
 *         description: Booking cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 booking:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                     cancellationReason:
 *                       type: string
 *       500:
 *         description: Server error
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
