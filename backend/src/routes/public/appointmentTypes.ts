import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /appointment-types
 * List all active appointment types
 */
router.get('/', async (req, res) => {
  try {
    const appointmentTypes = await prisma.appointmentType.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        duration: 'asc',
      },
    });

    res.json({
      appointmentTypes: appointmentTypes.map((type) => ({
        id: type.id,
        name: type.name,
        duration: type.duration,
        description: type.description,
        isCommon: type.isCommon,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch appointment types',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /appointment-types/:id
 * Get a specific appointment type
 */
router.get('/:id', async (req, res) => {
  try {
    const appointmentType = await prisma.appointmentType.findUnique({
      where: { id: req.params.id },
    });

    if (!appointmentType) {
      return res.status(404).json({ error: 'Appointment type not found' });
    }

    res.json({
      appointmentType: {
        id: appointmentType.id,
        name: appointmentType.name,
        duration: appointmentType.duration,
        description: appointmentType.description,
        isCommon: appointmentType.isCommon,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch appointment type',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
