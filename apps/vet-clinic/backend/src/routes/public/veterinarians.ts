import { Router } from 'express';
import { PrismaClient } from '../../generated/prisma';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /veterinarians
 * List all active veterinarians
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
 * GET /veterinarians/:id
 * Get a specific veterinarian
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
