import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { BookingService } from '../../services/bookingService';
import { publicRateLimit } from '../../middleware/rateLimit';

const router = Router();
const prisma = new PrismaClient();

const createBookingSchema = z.object({
  providerId: z.string().uuid(),
  patientId: z.string().uuid(),
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

    const booking = await BookingService.createBooking(data);

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
