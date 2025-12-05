import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '../../generated/prisma';
import { requirePetOwnerWithInfo, getPetOwnerFromClerk } from '../../middleware/clerkAuth';
import logger from '../../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// All routes require Clerk pet owner authentication
router.use(requirePetOwnerWithInfo);

const createPetSchema = z.object({
  name: z.string().min(1),
  species: z.string().min(1),
  breed: z.string().optional(),
  dateOfBirth: z.string().optional(),
  sex: z.string().optional(),
  weight: z.number().optional(),
  microchipNumber: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
});

const updatePetSchema = createPetSchema.partial();

/**
 * GET /owner/pets
 * Get all pets for the authenticated owner
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkOwner = getPetOwnerFromClerk(req);

    if (!clerkOwner?.email) {
      res.status(400).json({ error: 'Owner email not found' });
      return;
    }

    // Find owner by email or clerkUserId
    const owner = await prisma.petOwner.findFirst({
      where: {
        OR: [
          { clerkUserId: clerkOwner.clerkUserId },
          { email: clerkOwner.email },
        ],
      },
      include: {
        pets: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!owner) {
      res.json({ pets: [] });
      return;
    }

    res.json({
      owner: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
      },
      pets: owner.pets.map((pet) => ({
        id: pet.id,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        dateOfBirth: pet.dateOfBirth,
        sex: pet.sex,
        weight: pet.weight,
        allergies: pet.allergies,
        chronicConditions: pet.chronicConditions,
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch owner pets', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to fetch pets',
    });
  }
});

/**
 * POST /owner/pets
 * Add a new pet for the authenticated owner
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkOwner = getPetOwnerFromClerk(req);

    if (!clerkOwner?.clerkUserId) {
      res.status(400).json({ error: 'Owner authentication required' });
      return;
    }

    const data = createPetSchema.parse(req.body);

    // Find or create owner linked to Clerk user
    let owner = await prisma.petOwner.findFirst({
      where: {
        OR: [
          { clerkUserId: clerkOwner.clerkUserId },
          { email: clerkOwner.email },
        ],
      },
    });

    if (owner && !owner.clerkUserId) {
      // Link existing owner to Clerk user
      owner = await prisma.petOwner.update({
        where: { id: owner.id },
        data: { clerkUserId: clerkOwner.clerkUserId },
      });
    } else if (!owner) {
      // Create new owner
      owner = await prisma.petOwner.create({
        data: {
          name: `${clerkOwner.firstName || ''} ${clerkOwner.lastName || ''}`.trim() || 'Pet Owner',
          email: clerkOwner.email,
          phone: clerkOwner.phone,
          clerkUserId: clerkOwner.clerkUserId,
          consentNotifications: true,
          notificationChannel: 'email',
        },
      });
    }

    // Create new pet
    const pet = await prisma.pet.create({
      data: {
        name: data.name,
        species: data.species,
        breed: data.breed || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        sex: data.sex || null,
        weight: data.weight || null,
        microchipNumber: data.microchipNumber || null,
        allergies: data.allergies || [],
        chronicConditions: data.chronicConditions || [],
        ownerId: owner.id,
      },
    });

    logger.info('Pet created via Clerk auth', {
      petId: pet.id,
      clerkUserId: clerkOwner.clerkUserId,
    });

    res.status(201).json({
      pet: {
        id: pet.id,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        dateOfBirth: pet.dateOfBirth,
        sex: pet.sex,
        weight: pet.weight,
        allergies: pet.allergies,
        chronicConditions: pet.chronicConditions,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid pet data',
        details: error.errors,
      });
      return;
    }

    logger.error('Failed to create pet', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to create pet',
    });
  }
});

/**
 * PUT /owner/pets/:id
 * Update a pet owned by the authenticated owner
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkOwner = getPetOwnerFromClerk(req);
    const petId = req.params.id;

    if (!clerkOwner?.clerkUserId) {
      res.status(400).json({ error: 'Owner authentication required' });
      return;
    }

    // Find the pet and verify ownership
    const existingPet = await prisma.pet.findUnique({
      where: { id: petId },
      include: { owner: true },
    });

    if (!existingPet) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    // Verify ownership
    const isOwner =
      existingPet.owner.clerkUserId === clerkOwner.clerkUserId ||
      existingPet.owner.email === clerkOwner.email;

    if (!isOwner) {
      res.status(403).json({ error: 'Not authorized to update this pet' });
      return;
    }

    const data = updatePetSchema.parse(req.body);

    const pet = await prisma.pet.update({
      where: { id: petId },
      data: {
        name: data.name,
        species: data.species,
        breed: data.breed,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        sex: data.sex,
        weight: data.weight,
        microchipNumber: data.microchipNumber,
        allergies: data.allergies,
        chronicConditions: data.chronicConditions,
      },
    });

    logger.info('Pet updated via Clerk auth', {
      petId: pet.id,
      clerkUserId: clerkOwner.clerkUserId,
    });

    res.json({
      pet: {
        id: pet.id,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        dateOfBirth: pet.dateOfBirth,
        sex: pet.sex,
        weight: pet.weight,
        allergies: pet.allergies,
        chronicConditions: pet.chronicConditions,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid pet data',
        details: error.errors,
      });
      return;
    }

    logger.error('Failed to update pet', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to update pet',
    });
  }
});

/**
 * DELETE /owner/pets/:id
 * Soft delete a pet (mark as inactive)
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkOwner = getPetOwnerFromClerk(req);
    const petId = req.params.id;

    if (!clerkOwner?.clerkUserId) {
      res.status(400).json({ error: 'Owner authentication required' });
      return;
    }

    // Find the pet and verify ownership
    const existingPet = await prisma.pet.findUnique({
      where: { id: petId },
      include: { owner: true },
    });

    if (!existingPet) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    // Verify ownership
    const isOwner =
      existingPet.owner.clerkUserId === clerkOwner.clerkUserId ||
      existingPet.owner.email === clerkOwner.email;

    if (!isOwner) {
      res.status(403).json({ error: 'Not authorized to delete this pet' });
      return;
    }

    // Soft delete
    await prisma.pet.update({
      where: { id: petId },
      data: { isActive: false },
    });

    logger.info('Pet soft-deleted via Clerk auth', {
      petId,
      clerkUserId: clerkOwner.clerkUserId,
    });

    res.json({
      message: 'Pet removed successfully',
    });
  } catch (error) {
    logger.error('Failed to delete pet', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to delete pet',
    });
  }
});

export default router;
