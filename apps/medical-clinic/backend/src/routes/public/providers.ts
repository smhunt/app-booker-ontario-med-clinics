import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /providers:
 *   get:
 *     summary: List all providers
 *     description: Returns a list of all healthcare providers with their details
 *     tags: [Providers]
 *     responses:
 *       200:
 *         description: List of providers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 providers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Provider'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (_req, res): Promise<void> => {
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
        photoUrl: p.photoUrl,
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
 * @swagger
 * /providers/{id}:
 *   get:
 *     summary: Get provider by ID
 *     description: Returns details for a specific healthcare provider
 *     tags: [Providers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Provider ID
 *     responses:
 *       200:
 *         description: Provider details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 provider:
 *                   $ref: '#/components/schemas/Provider'
 *       404:
 *         description: Provider not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const provider = await prisma.provider.findUnique({
      where: { id: req.params.id },
      include: {
        clinic: true,
      },
    });

    if (!provider) {
      res.status(404).json({ error: 'Provider not found' });
      return;
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
