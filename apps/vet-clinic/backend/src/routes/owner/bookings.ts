import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '../../generated/prisma';
import { BookingService } from '../../services/bookingService';
import { requirePetOwnerWithInfo, getPetOwnerFromClerk } from '../../middleware/clerkAuth';
import logger from '../../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// All routes require Clerk pet owner authentication
router.use(requirePetOwnerWithInfo);

const createBookingSchema = z.object({
  veterinarianId: z.string().uuid(),
  petId: z.string().uuid(),
  appointmentTypeId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  modality: z.enum(['in-person', 'video', 'phone']),
  reason: z.string().optional(),
});

/**
 * GET /owner/bookings
 * Get all bookings for the authenticated owner's pets
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkOwner = getPetOwnerFromClerk(req);

    if (!clerkOwner?.email) {
      res.status(400).json({ error: 'Owner email not found' });
      return;
    }

    // Find owner by email or clerkUserId
    const owner = await prisma.petOwner.findFirst({
      where: {
        OR: [
          { clerkUserId: clerkOwner.clerkUserId },
          { email: clerkOwner.email },
        ],
      },
      include: {
        pets: true,
      },
    });

    if (!owner) {
      res.json({ bookings: [] });
      return;
    }

    const petIds = owner.pets.map((p) => p.id);

    // Get all bookings (upcoming and past)
    const bookings = await prisma.booking.findMany({
      where: {
        petId: { in: petIds },
      },
      include: {
        veterinarian: true,
        pet: true,
        appointmentType: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    res.json({
      owner: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
      },
      bookings: bookings.map((b) => ({
        id: b.id,
        date: b.date,
        time: b.time,
        modality: b.modality,
        status: b.status,
        reason: b.reason,
        pet: {
          id: b.pet.id,
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
        createdAt: b.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch owner bookings', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to fetch bookings',
    });
  }
});

/**
 * POST /owner/bookings
 * Create a new booking for one of the authenticated owner's pets
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkOwner = getPetOwnerFromClerk(req);

    if (!clerkOwner?.clerkUserId) {
      res.status(400).json({ error: 'Owner authentication required' });
      return;
    }

    const data = createBookingSchema.parse(req.body);

    // Verify the pet belongs to this owner
    const pet = await prisma.pet.findUnique({
      where: { id: data.petId },
      include: { owner: true },
    });

    if (!pet) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const isOwner =
      pet.owner.clerkUserId === clerkOwner.clerkUserId ||
      pet.owner.email === clerkOwner.email;

    if (!isOwner) {
      res.status(403).json({ error: 'Not authorized to book for this pet' });
      return;
    }

    // Link owner to Clerk if not already linked
    if (!pet.owner.clerkUserId) {
      await prisma.petOwner.update({
        where: { id: pet.owner.id },
        data: { clerkUserId: clerkOwner.clerkUserId },
      });
    }

    const booking = await BookingService.createBooking({
      veterinarianId: data.veterinarianId,
      petId: data.petId,
      appointmentTypeId: data.appointmentTypeId,
      date: new Date(data.date),
      time: data.time,
      modality: data.modality,
      reason: data.reason,
    });

    logger.info('Owner booking created via Clerk auth', {
      bookingId: booking.id,
      clerkUserId: clerkOwner.clerkUserId,
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
        pet: {
          name: booking.pet.name,
          species: booking.pet.species,
        },
        veterinarian: {
          name: booking.veterinarian.displayName || booking.veterinarian.name,
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

    logger.error('Failed to create owner booking', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to create booking',
    });
  }
});

/**
 * DELETE /owner/bookings/:id
 * Cancel a booking for the authenticated owner's pet
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkOwner = getPetOwnerFromClerk(req);
    const bookingId = req.params.id;
    const cancellationReason = req.body.reason;

    if (!clerkOwner?.clerkUserId) {
      res.status(400).json({ error: 'Owner authentication required' });
      return;
    }

    // Find the booking and verify ownership
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        pet: {
          include: { owner: true },
        },
      },
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    // Verify the booking belongs to this owner's pet
    const isOwner =
      booking.pet.owner.clerkUserId === clerkOwner.clerkUserId ||
      booking.pet.owner.email === clerkOwner.email;

    if (!isOwner) {
      res.status(403).json({ error: 'Not authorized to cancel this booking' });
      return;
    }

    const cancelledBooking = await BookingService.cancelBooking(
      bookingId,
      cancellationReason || 'Cancelled by owner'
    );

    logger.info('Owner booking cancelled via Clerk auth', {
      bookingId: cancelledBooking.id,
      clerkUserId: clerkOwner.clerkUserId,
    });

    res.json({
      message: 'Booking cancelled successfully',
      booking: {
        id: cancelledBooking.id,
        status: cancelledBooking.status,
      },
    });
  } catch (error) {
    logger.error('Failed to cancel owner booking', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to cancel booking',
    });
  }
});

export default router;
