import { Router } from 'express';
import { z } from 'zod';
import { BookingService } from '../../services/bookingService';

const router = Router();

const availabilitySchema = z.object({
  providerId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * GET /availability
 * Get available appointment slots for a provider on a specific date
 * Query params: providerId, date (YYYY-MM-DD)
 */
router.get('/', async (req, res) => {
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
      return res.status(400).json({
        error: 'Invalid parameters',
        details: error.errors,
      });
    }

    res.status(500).json({
      error: 'Failed to fetch availability',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
