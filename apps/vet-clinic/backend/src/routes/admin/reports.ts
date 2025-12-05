import { Router } from 'express';
import { PrismaClient } from '../../generated/prisma';
import { authenticate } from '../../middleware/auth';
import { requireStaff } from '../../middleware/rbac';

const router = Router();
const prisma = new PrismaClient();

// All report routes require staff authentication
router.use(authenticate);
router.use(requireStaff);

/**
 * GET /admin/reports/bookings
 * Get booking statistics
 */
router.get('/bookings', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate as string;
      if (endDate) where.date.lte = endDate as string;
    }

    const [
      totalBookings,
      completedBookings,
      cancelledBookings,
      pendingBookings,
      bookingsByVet,
      bookingsBySpecies,
      bookingsByType,
    ] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.count({ where: { ...where, status: 'completed' } }),
      prisma.booking.count({ where: { ...where, status: 'cancelled' } }),
      prisma.booking.count({ where: { ...where, status: { in: ['pending', 'approved'] } } }),
      prisma.booking.groupBy({
        by: ['veterinarianId'],
        where,
        _count: true,
      }),
      prisma.pet.groupBy({
        by: ['species'],
        _count: true,
      }),
      prisma.booking.groupBy({
        by: ['appointmentTypeId'],
        where,
        _count: true,
      }),
    ]);

    // Get veterinarian names
    const vetIds = bookingsByVet.map((b) => b.veterinarianId);
    const vets = await prisma.veterinarian.findMany({
      where: { id: { in: vetIds } },
      select: { id: true, name: true, displayName: true },
    });
    const vetMap = new Map(vets.map((v) => [v.id, v.displayName || v.name]));

    // Get appointment type names
    const typeIds = bookingsByType.map((b) => b.appointmentTypeId);
    const types = await prisma.appointmentType.findMany({
      where: { id: { in: typeIds } },
      select: { id: true, name: true },
    });
    const typeMap = new Map(types.map((t) => [t.id, t.name]));

    res.json({
      summary: {
        totalBookings,
        completedBookings,
        cancelledBookings,
        pendingBookings,
        completionRate: totalBookings > 0
          ? Math.round((completedBookings / totalBookings) * 100)
          : 0,
        cancellationRate: totalBookings > 0
          ? Math.round((cancelledBookings / totalBookings) * 100)
          : 0,
      },
      byVeterinarian: bookingsByVet.map((b) => ({
        veterinarianId: b.veterinarianId,
        veterinarianName: vetMap.get(b.veterinarianId) || 'Unknown',
        count: b._count,
      })),
      bySpecies: bookingsBySpecies.map((b) => ({
        species: b.species,
        count: b._count,
      })),
      byAppointmentType: bookingsByType.map((b) => ({
        appointmentTypeId: b.appointmentTypeId,
        appointmentTypeName: typeMap.get(b.appointmentTypeId) || 'Unknown',
        count: b._count,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate reports',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /admin/reports/owners
 * Get pet owner statistics
 */
router.get('/owners', async (_req, res) => {
  try {
    const [
      totalOwners,
      ownersWithMultiplePets,
      petsBySpecies,
      totalPets,
    ] = await Promise.all([
      prisma.petOwner.count(),
      prisma.petOwner.count({
        where: {
          pets: {
            some: {},
          },
        },
      }),
      prisma.pet.groupBy({
        by: ['species'],
        where: { isActive: true },
        _count: true,
      }),
      prisma.pet.count({ where: { isActive: true } }),
    ]);

    res.json({
      summary: {
        totalOwners,
        ownersWithPets: ownersWithMultiplePets,
        totalPets,
        averagePetsPerOwner: ownersWithMultiplePets > 0
          ? (totalPets / ownersWithMultiplePets).toFixed(1)
          : 0,
      },
      petsBySpecies: petsBySpecies.map((p) => ({
        species: p.species,
        count: p._count,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate owner reports',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
