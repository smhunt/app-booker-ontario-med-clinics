import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requirePatientWithInfo, getPatientFromClerk } from '../../middleware/clerkAuth';
import logger from '../../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// All routes require Clerk authentication
router.use(requirePatientWithInfo);

// Validation schemas with security constraints
const familyMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .transform((str) => new Date(str))
    .refine((date) => date <= new Date(), 'Date of birth cannot be in the future'),
  relationship: z.enum(['self', 'child', 'spouse', 'parent', 'sibling', 'grandparent', 'guardian', 'other']),
  gender: z.enum(['male', 'female', 'nonbinary', 'prefer_not_to_say']),
  healthCardNumber: z.string().max(20).optional(), // Ontario OHIP: 10 digits + version code
  postalCode: z.string()
    .regex(/^[A-Za-z]\d[A-Za-z][ ]?\d[A-Za-z]\d$/, 'Invalid Canadian postal code')
    .optional()
    .or(z.literal('')), // Allow empty string
  chronicConditions: z.array(z.string().max(100)).max(20).default([]),
  allergies: z.array(z.string().max(100)).max(20).default([]),
  canSelfConsent: z.boolean().default(true),
});

const updateFamilyMemberSchema = familyMemberSchema.partial();

/**
 * Helper to construct full name from Clerk patient
 */
function getFullName(clerkPatient: { firstName?: string; lastName?: string; email?: string }): string {
  const fullName = [clerkPatient.firstName, clerkPatient.lastName].filter(Boolean).join(' ');
  return fullName || clerkPatient.email?.split('@')[0] || 'Unknown';
}

/**
 * Helper to get or create PatientAccount for the authenticated Clerk user
 */
async function getOrCreateAccount(clerkUserId: string, email: string, name: string) {
  let account = await prisma.patientAccount.findFirst({
    where: {
      OR: [{ clerkUserId }, { email }],
    },
  });

  if (account && !account.clerkUserId) {
    // Link existing account to Clerk user
    account = await prisma.patientAccount.update({
      where: { id: account.id },
      data: { clerkUserId },
    });
  } else if (!account) {
    // Create new account
    account = await prisma.patientAccount.create({
      data: {
        clerkUserId,
        email,
        name,
        notificationChannel: 'email',
        consentNotifications: true,
        canReceiveSms: false,
        languages: ['en'],
        isActive: true,
      },
    });
  }

  return account;
}

/**
 * @swagger
 * /account/family-members:
 *   get:
 *     summary: List all family members for the authenticated account
 *     description: Returns all active family members (self and dependents) linked to the authenticated user's account
 *     tags: [Account - Family Members]
 *     security:
 *       - clerkAuth: []
 *     responses:
 *       200:
 *         description: List of family members
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 account:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     email: { type: string }
 *                     name: { type: string }
 *                 familyMembers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FamilyMember'
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkPatient = getPatientFromClerk(req);

    if (!clerkPatient?.clerkUserId || !clerkPatient?.email) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const account = await getOrCreateAccount(
      clerkPatient.clerkUserId,
      clerkPatient.email,
      getFullName(clerkPatient)
    );

    const familyMembers = await prisma.familyMember.findMany({
      where: {
        accountId: account.id,
        isActive: true,
      },
      orderBy: [
        { relationship: 'asc' }, // 'self' first
        { name: 'asc' },
      ],
    });

    res.json({
      account: {
        id: account.id,
        email: account.email,
        name: account.name,
      },
      familyMembers: familyMembers.map((fm) => ({
        id: fm.id,
        name: fm.name,
        dateOfBirth: fm.dateOfBirth,
        relationship: fm.relationship,
        gender: fm.gender,
        postalCode: fm.postalCode,
        chronicConditions: fm.chronicConditions,
        allergies: fm.allergies,
        canSelfConsent: fm.canSelfConsent,
        createdAt: fm.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch family members', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to fetch family members',
    });
  }
});

/**
 * @swagger
 * /account/family-members:
 *   post:
 *     summary: Add a new family member
 *     description: Add a new family member (child, spouse, parent, etc.) to the account
 *     tags: [Account - Family Members]
 *     security:
 *       - clerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, dateOfBirth, relationship, gender]
 *             properties:
 *               name: { type: string }
 *               dateOfBirth: { type: string, format: date }
 *               relationship: { type: string, enum: [self, child, spouse, parent, sibling, grandparent, guardian, other] }
 *               gender: { type: string, enum: [male, female, nonbinary, prefer_not_to_say] }
 *               healthCardNumber: { type: string }
 *               postalCode: { type: string }
 *               chronicConditions: { type: array, items: { type: string } }
 *               allergies: { type: array, items: { type: string } }
 *               canSelfConsent: { type: boolean }
 *     responses:
 *       201:
 *         description: Family member created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication required
 *       409:
 *         description: Self member already exists (only one 'self' allowed per account)
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

    const data = familyMemberSchema.parse(req.body);

    const account = await getOrCreateAccount(
      clerkPatient.clerkUserId,
      clerkPatient.email,
      getFullName(clerkPatient)
    );

    // Check if 'self' already exists for this account
    if (data.relationship === 'self') {
      const existingSelf = await prisma.familyMember.findFirst({
        where: {
          accountId: account.id,
          relationship: 'self',
          isActive: true,
        },
      });

      if (existingSelf) {
        res.status(409).json({
          error: 'Self member already exists',
          message: 'Each account can only have one family member with relationship "self"',
        });
        return;
      }
    }

    const familyMember = await prisma.familyMember.create({
      data: {
        accountId: account.id,
        name: data.name,
        dateOfBirth: data.dateOfBirth,
        relationship: data.relationship,
        gender: data.gender,
        healthCardNumber: data.healthCardNumber || null,
        postalCode: data.postalCode || null,
        chronicConditions: data.chronicConditions,
        allergies: data.allergies,
        canSelfConsent: data.canSelfConsent,
        isActive: true,
      },
    });

    logger.info('Family member created', {
      familyMemberId: familyMember.id,
      accountId: account.id,
      relationship: familyMember.relationship,
    });

    res.status(201).json({
      familyMember: {
        id: familyMember.id,
        name: familyMember.name,
        dateOfBirth: familyMember.dateOfBirth,
        relationship: familyMember.relationship,
        gender: familyMember.gender,
        postalCode: familyMember.postalCode,
        chronicConditions: familyMember.chronicConditions,
        allergies: familyMember.allergies,
        canSelfConsent: familyMember.canSelfConsent,
        createdAt: familyMember.createdAt,
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

    logger.error('Failed to create family member', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to create family member',
    });
  }
});

/**
 * @swagger
 * /account/family-members/{id}:
 *   get:
 *     summary: Get a specific family member
 *     tags: [Account - Family Members]
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
 *         description: Family member details
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not authorized to view this family member
 *       404:
 *         description: Family member not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkPatient = getPatientFromClerk(req);
    const familyMemberId = req.params.id;

    // Validate UUID format
    if (!z.string().uuid().safeParse(familyMemberId).success) {
      res.status(400).json({ error: 'Invalid family member ID format' });
      return;
    }

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
    });

    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    const familyMember = await prisma.familyMember.findUnique({
      where: { id: familyMemberId },
    });

    if (!familyMember || !familyMember.isActive) {
      res.status(404).json({ error: 'Family member not found' });
      return;
    }

    if (familyMember.accountId !== account.id) {
      res.status(403).json({ error: 'Not authorized to view this family member' });
      return;
    }

    res.json({
      familyMember: {
        id: familyMember.id,
        name: familyMember.name,
        dateOfBirth: familyMember.dateOfBirth,
        relationship: familyMember.relationship,
        gender: familyMember.gender,
        postalCode: familyMember.postalCode,
        chronicConditions: familyMember.chronicConditions,
        allergies: familyMember.allergies,
        canSelfConsent: familyMember.canSelfConsent,
        createdAt: familyMember.createdAt,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch family member', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to fetch family member',
    });
  }
});

/**
 * @swagger
 * /account/family-members/{id}:
 *   put:
 *     summary: Update a family member
 *     tags: [Account - Family Members]
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               dateOfBirth: { type: string, format: date }
 *               gender: { type: string }
 *               postalCode: { type: string }
 *               chronicConditions: { type: array, items: { type: string } }
 *               allergies: { type: array, items: { type: string } }
 *               canSelfConsent: { type: boolean }
 *     responses:
 *       200:
 *         description: Family member updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not authorized to update this family member
 *       404:
 *         description: Family member not found
 *       500:
 *         description: Server error
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkPatient = getPatientFromClerk(req);
    const familyMemberId = req.params.id;

    // Validate UUID format
    if (!z.string().uuid().safeParse(familyMemberId).success) {
      res.status(400).json({ error: 'Invalid family member ID format' });
      return;
    }

    if (!clerkPatient?.clerkUserId || !clerkPatient?.email) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const data = updateFamilyMemberSchema.parse(req.body);

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

    const existingMember = await prisma.familyMember.findUnique({
      where: { id: familyMemberId },
    });

    if (!existingMember || !existingMember.isActive) {
      res.status(404).json({ error: 'Family member not found' });
      return;
    }

    if (existingMember.accountId !== account.id) {
      res.status(403).json({ error: 'Not authorized to update this family member' });
      return;
    }

    // Don't allow changing relationship type (especially from/to 'self')
    if (data.relationship && data.relationship !== existingMember.relationship) {
      res.status(400).json({
        error: 'Cannot change relationship type',
        message: 'To change relationship, delete this member and create a new one',
      });
      return;
    }

    const updatedMember = await prisma.familyMember.update({
      where: { id: familyMemberId },
      data: {
        name: data.name,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        healthCardNumber: data.healthCardNumber,
        postalCode: data.postalCode,
        chronicConditions: data.chronicConditions,
        allergies: data.allergies,
        canSelfConsent: data.canSelfConsent,
      },
    });

    logger.info('Family member updated', {
      familyMemberId: updatedMember.id,
      accountId: account.id,
    });

    res.json({
      familyMember: {
        id: updatedMember.id,
        name: updatedMember.name,
        dateOfBirth: updatedMember.dateOfBirth,
        relationship: updatedMember.relationship,
        gender: updatedMember.gender,
        postalCode: updatedMember.postalCode,
        chronicConditions: updatedMember.chronicConditions,
        allergies: updatedMember.allergies,
        canSelfConsent: updatedMember.canSelfConsent,
        updatedAt: updatedMember.updatedAt,
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

    logger.error('Failed to update family member', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to update family member',
    });
  }
});

/**
 * @swagger
 * /account/family-members/{id}:
 *   delete:
 *     summary: Remove a family member (soft delete)
 *     description: Soft-deletes a family member. Cannot delete 'self' member.
 *     tags: [Account - Family Members]
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
 *         description: Family member removed
 *       400:
 *         description: Cannot delete self member
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not authorized to delete this family member
 *       404:
 *         description: Family member not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkPatient = getPatientFromClerk(req);
    const familyMemberId = req.params.id;

    // Validate UUID format
    if (!z.string().uuid().safeParse(familyMemberId).success) {
      res.status(400).json({ error: 'Invalid family member ID format' });
      return;
    }

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
    });

    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    const familyMember = await prisma.familyMember.findUnique({
      where: { id: familyMemberId },
    });

    if (!familyMember || !familyMember.isActive) {
      res.status(404).json({ error: 'Family member not found' });
      return;
    }

    if (familyMember.accountId !== account.id) {
      res.status(403).json({ error: 'Not authorized to delete this family member' });
      return;
    }

    // Cannot delete 'self' member
    if (familyMember.relationship === 'self') {
      res.status(400).json({
        error: 'Cannot delete self',
        message: 'You cannot remove yourself from your account',
      });
      return;
    }

    // Soft delete
    await prisma.familyMember.update({
      where: { id: familyMemberId },
      data: { isActive: false },
    });

    logger.info('Family member deleted (soft)', {
      familyMemberId,
      accountId: account.id,
    });

    res.json({
      message: 'Family member removed successfully',
    });
  } catch (error) {
    logger.error('Failed to delete family member', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to delete family member',
    });
  }
});

export default router;
