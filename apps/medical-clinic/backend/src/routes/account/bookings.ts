import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requirePatientWithInfo, getPatientFromClerk } from '../../middleware/clerkAuth';
import logger from '../../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// All routes require Clerk authentication
router.use(requirePatientWithInfo);

// Validation schemas
const createBookingSchema = z.object({
  familyMemberId: z.string().uuid('Invalid family member ID'),
  providerId: z.string().uuid('Invalid provider ID'),
  appointmentTypeId: z.string().uuid('Invalid appointment type ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format'),
  modality: z.enum(['in-person', 'video', 'phone']),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * @swagger
 * /account/bookings:
 *   get:
 *     summary: List all bookings for family members
 *     description: Returns all bookings for all family members linked to the authenticated account
 *     tags: [Account - Bookings]
 *     security:
 *       - clerkAuth: []
 *     parameters:
 *       - in: query
 *         name: familyMemberId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific family member
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed]
 *         description: Filter by booking status
 *       - in: query
 *         name: upcoming
 *         schema:
 *           type: boolean
 *         description: Only show upcoming appointments
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
 *                     $ref: '#/components/schemas/FamilyMemberBooking'
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkPatient = getPatientFromClerk(req);
    const { familyMemberId, status, upcoming } = req.query;

    if (!clerkPatient?.clerkUserId || !clerkPatient?.email) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Find the account
    const account = await prisma.patientAccount.findFirst({
      where: {
        OR: [
          { clerkUserId: clerkPatient.clerkUserId },
          { email: clerkPatient.email },
        ],
      },
      include: {
        familyMembers: {
          where: { isActive: true },
        },
      },
    });

    if (!account) {
      res.json({ bookings: [] });
      return;
    }

    const familyMemberIds = account.familyMembers.map((fm) => fm.id);

    // Build query filters
    const whereClause: Record<string, unknown> = {
      familyMemberId: familyMemberId
        ? { equals: familyMemberId as string }
        : { in: familyMemberIds },
    };

    if (status) {
      whereClause.status = status as string;
    }

    if (upcoming === 'true') {
      whereClause.date = { gte: new Date() };
    }

    const bookings = await prisma.familyMemberBooking.findMany({
      where: whereClause,
      include: {
        familyMember: true,
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });

    // Fetch provider and appointment type info separately (not linked via FK in new model)
    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const [provider, appointmentType] = await Promise.all([
          prisma.provider.findUnique({ where: { id: booking.providerId } }),
          prisma.appointmentType.findUnique({ where: { id: booking.appointmentTypeId } }),
        ]);

        return {
          id: booking.id,
          date: booking.date,
          time: booking.time,
          modality: booking.modality,
          status: booking.status,
          reason: booking.reason,
          notes: booking.notes,
          familyMember: {
            id: booking.familyMember.id,
            name: booking.familyMember.name,
            relationship: booking.familyMember.relationship,
          },
          provider: provider
            ? {
                id: provider.id,
                name: provider.displayName,
                specialty: provider.specialty,
              }
            : null,
          appointmentType: appointmentType
            ? {
                id: appointmentType.id,
                name: appointmentType.name,
                duration: appointmentType.duration,
              }
            : null,
          createdAt: booking.createdAt,
        };
      })
    );

    res.json({
      account: {
        id: account.id,
        name: account.name,
      },
      bookings: enrichedBookings,
    });
  } catch (error) {
    logger.error('Failed to fetch family member bookings', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to fetch bookings',
    });
  }
});

/**
 * @swagger
 * /account/bookings:
 *   post:
 *     summary: Create a booking for a family member
 *     description: Book an appointment for any family member linked to the account
 *     tags: [Account - Bookings]
 *     security:
 *       - clerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [familyMemberId, providerId, appointmentTypeId, date, time, modality]
 *             properties:
 *               familyMemberId: { type: string, format: uuid }
 *               providerId: { type: string, format: uuid }
 *               appointmentTypeId: { type: string, format: uuid }
 *               date: { type: string, format: date, example: "2024-12-20" }
 *               time: { type: string, example: "09:00" }
 *               modality: { type: string, enum: [in-person, video, phone] }
 *               reason: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Booking created
 *       400:
 *         description: Invalid input or slot unavailable
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not authorized to book for this family member
 *       404:
 *         description: Family member, provider, or appointment type not found
 *       500:
 *         description: Server error
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkPatient = getPatientFromClerk(req);

    if (!clerkPatient?.clerkUserId || !clerkPatient?.email) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const data = createBookingSchema.parse(req.body);

    // Find the account
    const account = await prisma.patientAccount.findFirst({
      where: {
        OR: [
          { clerkUserId: clerkPatient.clerkUserId },
          { email: clerkPatient.email },
        ],
      },
    });

    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    // Verify family member belongs to this account
    const familyMember = await prisma.familyMember.findUnique({
      where: { id: data.familyMemberId },
    });

    if (!familyMember || !familyMember.isActive) {
      res.status(404).json({ error: 'Family member not found' });
      return;
    }

    if (familyMember.accountId !== account.id) {
      res.status(403).json({ error: 'Not authorized to book for this family member' });
      return;
    }

    // Verify provider exists
    const provider = await prisma.provider.findUnique({
      where: { id: data.providerId },
    });

    if (!provider) {
      res.status(404).json({ error: 'Provider not found' });
      return;
    }

    // Verify appointment type exists
    const appointmentType = await prisma.appointmentType.findUnique({
      where: { id: data.appointmentTypeId },
    });

    if (!appointmentType || !appointmentType.isActive) {
      res.status(404).json({ error: 'Appointment type not found' });
      return;
    }

    // Check for conflicting bookings
    const existingBooking = await prisma.familyMemberBooking.findFirst({
      where: {
        providerId: data.providerId,
        date: new Date(data.date),
        time: data.time,
        status: { notIn: ['cancelled'] },
      },
    });

    if (existingBooking) {
      res.status(400).json({
        error: 'Slot unavailable',
        message: 'This time slot is already booked',
      });
      return;
    }

    // Create the booking
    const booking = await prisma.familyMemberBooking.create({
      data: {
        familyMemberId: data.familyMemberId,
        providerId: data.providerId,
        appointmentTypeId: data.appointmentTypeId,
        date: new Date(data.date),
        time: data.time,
        modality: data.modality,
        reason: data.reason || null,
        notes: data.notes || null,
        status: 'pending',
      },
      include: {
        familyMember: true,
      },
    });

    logger.info('Family member booking created', {
      bookingId: booking.id,
      accountId: account.id,
      familyMemberId: familyMember.id,
      familyMemberName: familyMember.name,
      relationship: familyMember.relationship,
    });

    res.status(201).json({
      booking: {
        id: booking.id,
        date: booking.date,
        time: booking.time,
        modality: booking.modality,
        status: booking.status,
        reason: booking.reason,
        familyMember: {
          id: booking.familyMember.id,
          name: booking.familyMember.name,
          relationship: booking.familyMember.relationship,
        },
        provider: {
          id: provider.id,
          name: provider.displayName,
        },
        appointmentType: {
          id: appointmentType.id,
          name: appointmentType.name,
          duration: appointmentType.duration,
        },
        createdAt: booking.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid input',
        details: error.errors,
      });
      return;
    }

    logger.error('Failed to create family member booking', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to create booking',
    });
  }
});

/**
 * @swagger
 * /account/bookings/{id}:
 *   get:
 *     summary: Get a specific booking
 *     tags: [Account - Bookings]
 *     security:
 *       - clerkAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Booking details
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not authorized to view this booking
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkPatient = getPatientFromClerk(req);
    const bookingId = req.params.id;

    if (!clerkPatient?.clerkUserId || !clerkPatient?.email) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const account = await prisma.patientAccount.findFirst({
      where: {
        OR: [
          { clerkUserId: clerkPatient.clerkUserId },
          { email: clerkPatient.email },
        ],
      },
      include: {
        familyMembers: { where: { isActive: true } },
      },
    });

    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    const booking = await prisma.familyMemberBooking.findUnique({
      where: { id: bookingId },
      include: { familyMember: true },
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    // Verify booking belongs to account's family member
    const familyMemberIds = account.familyMembers.map((fm) => fm.id);
    if (!familyMemberIds.includes(booking.familyMemberId)) {
      res.status(403).json({ error: 'Not authorized to view this booking' });
      return;
    }

    const [provider, appointmentType] = await Promise.all([
      prisma.provider.findUnique({ where: { id: booking.providerId } }),
      prisma.appointmentType.findUnique({ where: { id: booking.appointmentTypeId } }),
    ]);

    res.json({
      booking: {
        id: booking.id,
        date: booking.date,
        time: booking.time,
        modality: booking.modality,
        status: booking.status,
        reason: booking.reason,
        notes: booking.notes,
        cancellationReason: booking.cancellationReason,
        familyMember: {
          id: booking.familyMember.id,
          name: booking.familyMember.name,
          relationship: booking.familyMember.relationship,
        },
        provider: provider
          ? {
              id: provider.id,
              name: provider.displayName,
              specialty: provider.specialty,
            }
          : null,
        appointmentType: appointmentType
          ? {
              id: appointmentType.id,
              name: appointmentType.name,
              duration: appointmentType.duration,
            }
          : null,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch booking', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to fetch booking',
    });
  }
});

/**
 * @swagger
 * /account/bookings/{id}:
 *   delete:
 *     summary: Cancel a booking
 *     tags: [Account - Bookings]
 *     security:
 *       - clerkAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, description: "Reason for cancellation" }
 *     responses:
 *       200:
 *         description: Booking cancelled
 *       400:
 *         description: Booking already cancelled or completed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not authorized to cancel this booking
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkPatient = getPatientFromClerk(req);
    const bookingId = req.params.id;
    const cancellationReason = req.body.reason || 'Cancelled by patient';

    if (!clerkPatient?.clerkUserId || !clerkPatient?.email) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const account = await prisma.patientAccount.findFirst({
      where: {
        OR: [
          { clerkUserId: clerkPatient.clerkUserId },
          { email: clerkPatient.email },
        ],
      },
      include: {
        familyMembers: { where: { isActive: true } },
      },
    });

    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    const booking = await prisma.familyMemberBooking.findUnique({
      where: { id: bookingId },
      include: { familyMember: true },
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    // Verify booking belongs to account's family member
    const familyMemberIds = account.familyMembers.map((fm) => fm.id);
    if (!familyMemberIds.includes(booking.familyMemberId)) {
      res.status(403).json({ error: 'Not authorized to cancel this booking' });
      return;
    }

    // Check if already cancelled or completed
    if (booking.status === 'cancelled') {
      res.status(400).json({ error: 'Booking is already cancelled' });
      return;
    }

    if (booking.status === 'completed') {
      res.status(400).json({ error: 'Cannot cancel a completed booking' });
      return;
    }

    // Cancel the booking
    const cancelledBooking = await prisma.familyMemberBooking.update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
        cancellationReason,
      },
    });

    logger.info('Family member booking cancelled', {
      bookingId: cancelledBooking.id,
      accountId: account.id,
      familyMemberId: booking.familyMemberId,
      reason: cancellationReason,
    });

    res.json({
      message: 'Booking cancelled successfully',
      booking: {
        id: cancelledBooking.id,
        status: cancelledBooking.status,
        cancellationReason: cancelledBooking.cancellationReason,
      },
    });
  } catch (error) {
    logger.error('Failed to cancel booking', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to cancel booking',
    });
  }
});

export default router;
