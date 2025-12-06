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
 * @swagger
 * /admin/bookings:
 *   get:
 *     summary: List all bookings (Admin)
 *     description: Returns all bookings with optional filters. Requires staff authentication.
 *     tags: [Admin - Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed]
 *         description: Filter by booking status
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by provider
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by patient
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings until this date
 *     responses:
 *       200:
 *         description: List of bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AdminBooking'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires staff role
 *       500:
 *         description: Server error
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
 * @swagger
 * /admin/bookings/{id}/approve:
 *   patch:
 *     summary: Approve a booking (Admin)
 *     description: Approves a pending booking and changes status to confirmed
 *     tags: [Admin - Bookings]
 *     security:
 *       - bearerAuth: []
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
 *         description: Booking approved
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
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
 * @swagger
 * /admin/bookings/{id}/decline:
 *   patch:
 *     summary: Decline a booking (Admin)
 *     description: Declines a pending booking with optional reason
 *     tags: [Admin - Bookings]
 *     security:
 *       - bearerAuth: []
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
 *                 description: Reason for declining
 *     responses:
 *       200:
 *         description: Booking declined
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
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

export default router;
