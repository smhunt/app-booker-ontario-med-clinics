import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '../../generated/prisma';
import { BookingService } from '../../services/bookingService';
import { publicRateLimit } from '../../middleware/rateLimit';

const router = Router();
const prisma = new PrismaClient();

const createBookingSchema = z.object({
  veterinarianId: z.string().uuid(),
  petId: z.string().uuid().optional(),
  ownerInfo: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    preferredNotification: z.enum(['email', 'sms', 'voice']),
  }).optional(),
  petInfo: z.object({
    name: z.string(),
    species: z.string(),
    breed: z.string().optional(),
    dateOfBirth: z.string().optional(),
    sex: z.string().optional(),
  }).optional(),
  appointmentTypeId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  modality: z.enum(['in-person', 'video', 'phone']),
  reason: z.string().optional(),
});

/**
 * POST /bookings
 * Create a new booking
 */
router.post('/', publicRateLimit, async (req, res): Promise<void> => {
  try {
    const data = createBookingSchema.parse(req.body);

    // Find or create pet and owner if info is provided
    let petId = data.petId;

    if (!petId && data.ownerInfo && data.petInfo) {
      const { name, email, phone, preferredNotification } = data.ownerInfo;
      const { name: petName, species, breed, dateOfBirth, sex } = data.petInfo;

      // Try to find existing owner by email
      let owner = await prisma.petOwner.findFirst({
        where: { email },
      });

      // Create new owner if not found
      if (!owner) {
        owner = await prisma.petOwner.create({
          data: {
            name,
            email,
            phone: phone || null,
            consentNotifications: true,
            canReceiveSMS: !!phone,
            notificationChannel: preferredNotification,
            languages: ['en'],
          },
        });
      }

      // Create new pet for this owner
      const pet = await prisma.pet.create({
        data: {
          name: petName,
          species,
          breed: breed || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          sex: sex || null,
          ownerId: owner.id,
        },
      });

      petId = pet.id;
    }

    if (!petId) {
      res.status(400).json({
        error: 'Either petId or ownerInfo + petInfo must be provided',
      });
      return;
    }

    const booking = await BookingService.createBooking({
      veterinarianId: data.veterinarianId,
      petId,
      appointmentTypeId: data.appointmentTypeId,
      date: new Date(data.date),
      time: data.time,
      modality: data.modality,
      reason: data.reason,
    });

    res.status(201).json({
      booking: {
        id: booking.id,
        veterinarianId: booking.veterinarianId,
        petId: booking.petId,
        date: booking.date,
        time: booking.time,
        modality: booking.modality,
        status: booking.status,
        veterinarian: {
          name: booking.veterinarian.displayName || booking.veterinarian.name,
        },
        pet: {
          name: booking.pet.name,
          species: booking.pet.species,
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
 * GET /bookings/owner/:email
 * Get upcoming bookings for an owner by email
 */
router.get('/owner/:email', async (req, res): Promise<void> => {
  try {
    const email = decodeURIComponent(req.params.email);

    // Find owner by email
    const owner = await prisma.petOwner.findFirst({
      where: { email },
      include: { pets: true },
    });

    if (!owner) {
      res.json({ bookings: [] });
      return;
    }

    const petIds = owner.pets.map((p) => p.id);

    // Get upcoming bookings for all pets
    const today = new Date().toISOString().split('T')[0];
    const bookings = await prisma.booking.findMany({
      where: {
        petId: { in: petIds },
        status: { in: ['pending', 'approved', 'confirmed'] },
        date: { gte: today },
      },
      include: {
        veterinarian: true,
        pet: true,
        appointmentType: true,
      },
      orderBy: {
        date: 'asc',
      },
      take: 10,
    });

    res.json({
      owner: {
        name: owner.name,
        email: owner.email,
      },
      bookings: bookings.map((b) => ({
        id: b.id,
        date: b.date,
        time: b.time,
        modality: b.modality,
        status: b.status,
        pet: {
          name: b.pet.name,
          species: b.pet.species,
        },
        veterinarian: {
          name: b.veterinarian.displayName || b.veterinarian.name,
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
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        veterinarian: true,
        pet: {
          include: { owner: true },
        },
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
        pet: {
          name: booking.pet.name,
          species: booking.pet.species,
          breed: booking.pet.breed,
        },
        veterinarian: {
          name: booking.veterinarian.displayName || booking.veterinarian.name,
          specialty: booking.veterinarian.specialty,
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
