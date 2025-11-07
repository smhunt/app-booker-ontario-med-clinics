import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
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
    const { status, providerId, patientId, startDate, endDate } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (providerId) where.providerId = providerId;
    if (patientId) where.patientId = patientId;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        provider: true,
        patient: true,
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
        provider: {
          id: b.provider.id,
          name: b.provider.displayName,
        },
        patient: {
          id: b.patient.id,
          name: b.patient.name,
          fakeMrn: b.patient.fakeMrn,
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
        provider: true,
        patient: true,
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
        cancellationReason: booking.cancellationReason,
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
 * GET /admin/reports/bookings
 * Get booking statistics
 */
router.get('/reports/bookings', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const [total, byStatus, byProvider, byModality, bookingsWithProvider] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.booking.groupBy({
        by: ['providerId'],
        where,
        _count: true,
      }),
      prisma.booking.groupBy({
        by: ['modality'],
        where,
        _count: true,
      }),
      prisma.booking.findMany({
        where,
        include: { provider: true },
        select: { provider: { select: { displayName: true } } },
      }),
    ]);

    // Map provider IDs to names
    const providerNameMap: Record<string, string> = {};
    bookingsWithProvider.forEach((b) => {
      providerNameMap[b.provider.displayName] = b.provider.displayName;
    });

    // Count by provider name
    const providerBookings = await prisma.booking.findMany({
      where,
      include: { provider: true },
    });

    const byProviderNamed: Record<string, number> = {};
    providerBookings.forEach((b) => {
      const name = b.provider.displayName;
      byProviderNamed[name] = (byProviderNamed[name] || 0) + 1;
    });

    // Format the stats
    const byStatusObj: Record<string, number> = {};
    byStatus.forEach((item) => {
      byStatusObj[item.status] = item._count;
    });

    const byModalityObj: Record<string, number> = {};
    byModality.forEach((item) => {
      byModalityObj[item.modality] = item._count;
    });

    res.json({
      stats: {
        total,
        byStatus: byStatusObj,
        byProvider: byProviderNamed,
        byModality: byModalityObj,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate report',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
