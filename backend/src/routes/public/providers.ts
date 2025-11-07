import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /providers
 * List all active providers
 */
router.get('/', async (req, res) => {
  try {
    const providers = await prisma.provider.findMany({
      include: {
        clinic: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({
      providers: providers.map((p) => ({
        id: p.id,
        fullName: p.name,
        credentials: p.displayName,
        specialty: p.specialty,
        team: p.team,
        rosterStatus: p.rosterStatus,
        acceptsNewPatients: p.acceptsNewPatients,
        bio: p.bio,
        workingHours: p.workingHours,
        clinic: {
          name: p.clinic.name,
          type: p.clinic.type,
        },
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch providers',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /providers/:id
 * Get a specific provider
 */
router.get('/:id', async (req, res) => {
  try {
    const provider = await prisma.provider.findUnique({
      where: { id: req.params.id },
      include: {
        clinic: true,
      },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({
      provider: {
        id: provider.id,
        fullName: provider.name,
        credentials: provider.displayName,
        specialty: provider.specialty,
        team: provider.team,
        workingHours: provider.workingHours,
        rosterStatus: provider.rosterStatus,
        acceptsNewPatients: provider.acceptsNewPatients,
        bio: provider.bio,
        clinic: {
          name: provider.clinic.name,
          type: provider.clinic.type,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch provider',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
