import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

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
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const [total, byStatus, byProvider, byModality] = await Promise.all([
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
    ]);

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
    console.error('Error generating booking report:', error);
    res.status(500).json({
      error: 'Failed to generate report',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
