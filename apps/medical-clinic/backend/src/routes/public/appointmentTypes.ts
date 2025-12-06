import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /appointment-types:
 *   get:
 *     summary: List all appointment types
 *     description: Returns a list of all active appointment types with their durations
 *     tags: [Appointment Types]
 *     responses:
 *       200:
 *         description: List of appointment types
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 appointmentTypes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AppointmentType'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (_req, res): Promise<void> => {
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
 * @swagger
 * /appointment-types/{id}:
 *   get:
 *     summary: Get appointment type by ID
 *     description: Returns details for a specific appointment type
 *     tags: [Appointment Types]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Appointment type ID
 *     responses:
 *       200:
 *         description: Appointment type details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 appointmentType:
 *                   $ref: '#/components/schemas/AppointmentType'
 *       404:
 *         description: Appointment type not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const appointmentType = await prisma.appointmentType.findUnique({
      where: { id: req.params.id },
    });

    if (!appointmentType) {
      res.status(404).json({ error: 'Appointment type not found' });
      return;
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
