import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimit';
import { AuditService } from '../services/auditService';
import logger from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate staff user
 *     description: Login with email and password to receive a JWT token for accessing protected endpoints
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@ildertonhealth-demo.ca
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: Admin123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [admin, staff]
 *       400:
 *         description: Invalid input (validation error)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many login attempts
 */
router.post('/login', authRateLimit, async (req, res): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      logger.warn('Login failed: user not found or inactive', { email });
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
      });
      return;
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      logger.warn('Login failed: invalid password', { email });
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
      });
      return;
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    // Audit log
    await AuditService.log({
      userId: user.id,
      userRole: user.role,
      action: 'login',
      resource: 'user',
      resourceId: user.id,
      req,
    });

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
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

    logger.error('Login error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'Authentication failed',
      message: 'An error occurred during authentication',
    });
  }
});

export default router;
