import { Router } from 'express';
import { z } from 'zod';
import { BookingService } from '../../services/bookingService';

const router = Router();

const availabilitySchema = z.object({
  providerId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * @swagger
 * /availability:
 *   get:
 *     summary: Get available appointment slots
 *     description: Returns available time slots for a specific provider on a given date
 *     tags: [Availability]
 *     parameters:
 *       - in: query
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Provider ID
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-15"
 *         description: Date in YYYY-MM-DD format
 *     responses:
 *       200:
 *         description: Available slots
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 providerId:
 *                   type: string
 *                   format: uuid
 *                 date:
 *                   type: string
 *                   format: date
 *                 slots:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TimeSlot'
 *       400:
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res): Promise<void> => {
  try {
    const params = availabilitySchema.parse(req.query);

    const slots = await BookingService.getAvailability(
      params.providerId,
      params.date
    );

    res.json({
      providerId: params.providerId,
      date: params.date,
      slots: slots.filter((s) => s.available),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid parameters',
        details: error.errors,
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to fetch availability',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
