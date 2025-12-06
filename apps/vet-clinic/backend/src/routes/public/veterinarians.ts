import { Router } from 'express';
import { PrismaClient } from '../../generated/prisma';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /veterinarians:
 *   get:
 *     summary: List all veterinarians
 *     description: Returns a list of all active veterinarians
 *     tags: [Veterinarians]
 *     responses:
 *       200:
 *         description: List of veterinarians
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 veterinarians:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Veterinarian'
 *       500:
 *         description: Server error
 */
router.get('/', async (_req, res): Promise<void> => {
  try {
    const veterinarians = await prisma.veterinarian.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({
      veterinarians: veterinarians.map((v) => ({
        id: v.id,
        name: v.name,
        displayName: v.displayName,
        specialty: v.specialty,
        team: v.team,
        acceptsNewClients: v.acceptsNewClients,
        languages: v.languages,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch veterinarians',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /veterinarians/{id}:
 *   get:
 *     summary: Get veterinarian by ID
 *     tags: [Veterinarians]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Veterinarian details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 veterinarian:
 *                   $ref: '#/components/schemas/Veterinarian'
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const veterinarian = await prisma.veterinarian.findUnique({
      where: { id: req.params.id },
    });

    if (!veterinarian) {
      res.status(404).json({ error: 'Veterinarian not found' });
      return;
    }

    res.json({
      veterinarian: {
        id: veterinarian.id,
        name: veterinarian.name,
        displayName: veterinarian.displayName,
        specialty: veterinarian.specialty,
        team: veterinarian.team,
        acceptsNewClients: veterinarian.acceptsNewClients,
        languages: veterinarian.languages,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch veterinarian',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
