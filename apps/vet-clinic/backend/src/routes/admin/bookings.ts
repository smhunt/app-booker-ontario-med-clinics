import { Router } from 'express';
import { PrismaClient } from '../../generated/prisma';
import { authenticate } from '../../middleware/auth';
import { requireStaff } from '../../middleware/rbac';
import { BookingService } from '../../services/bookingService';
import { AuditService } from '../../services/auditService';

const router = Router();
const prisma = new PrismaClient();

// All admin booking routes require authentication
router.use(authenticate);
router.use(requireStaff);

/**
 * GET /admin/bookings
 * List all bookings with filters
 */
router.get('/', async (req, res) => {
  try {
    const { status, veterinarianId, petId, ownerId, startDate, endDate } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (veterinarianId) where.veterinarianId = veterinarianId;
    if (petId) where.petId = petId;

    if (ownerId) {
      where.pet = { ownerId: ownerId };
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate as string;
      if (endDate) where.date.lte = endDate as string;
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        veterinarian: true,
        pet: {
          include: { owner: true },
        },
        appointmentType: true,
      },
      orderBy: {
        date: 'desc',
      },
      take: 100,
    });

    res.json({
      bookings: bookings.map((b) => ({
        id: b.id,
        date: b.date,
        time: b.time,
        modality: b.modality,
        status: b.status,
        reason: b.reason,
        veterinarian: {
          id: b.veterinarian.id,
          name: b.veterinarian.displayName || b.veterinarian.name,
        },
        pet: {
          id: b.pet.id,
          name: b.pet.name,
          species: b.pet.species,
        },
        owner: {
          id: b.pet.owner.id,
          name: b.pet.owner.name,
          email: b.pet.owner.email,
        },
        appointmentType: {
          name: b.appointmentType.name,
          duration: b.appointmentType.duration,
        },
        createdAt: b.createdAt,
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
 * PATCH /admin/bookings/:id/approve
 * Approve a pending booking
 */
router.patch('/:id/approve', async (req, res) => {
  try {
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: 'confirmed' },
      include: {
        veterinarian: true,
        pet: {
          include: { owner: true },
        },
      },
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'approve_booking',
      resource: 'booking',
      resourceId: booking.id,
      req,
    });

    res.json({
      message: 'Booking approved',
      booking: {
        id: booking.id,
        status: booking.status,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to approve booking',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /admin/bookings/:id/decline
 * Decline a pending booking
 */
router.patch('/:id/decline', async (req, res) => {
  try {
    const reason = req.body.reason || 'Declined by staff';

    const booking = await BookingService.cancelBooking(
      req.params.id,
      reason,
      req.user!.id
    );

    res.json({
      message: 'Booking declined',
      booking: {
        id: booking.id,
        status: booking.status,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to decline booking',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /admin/bookings/:id/complete
 * Mark a booking as completed
 */
router.patch('/:id/complete', async (req, res) => {
  try {
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: 'completed' },
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'complete_booking',
      resource: 'booking',
      resourceId: booking.id,
      req,
    });

    res.json({
      message: 'Booking marked as completed',
      booking: {
        id: booking.id,
        status: booking.status,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to complete booking',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
