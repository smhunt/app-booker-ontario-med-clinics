import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma';
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
 *     description: Login with email and password to receive a JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@vetclinic-demo.ca
 *               password:
 *                 type: string
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
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     email: { type: string }
 *                     name: { type: string }
 *                     role: { type: string }
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many attempts
 */
router.post('/login', authRateLimit, async (req, res): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find admin user
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      logger.warn('Login failed: admin not found', { email });
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
      });
      return;
    }

    // Verify password
    const valid = await bcrypt.compare(password, admin.password);
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
      id: admin.id,
      email: admin.email,
      role: admin.role,
      name: admin.name,
    });

    // Audit log
    await AuditService.log({
      userId: admin.id,
      userRole: admin.role,
      action: 'login',
      resource: 'admin',
      resourceId: admin.id,
      req,
    });

    logger.info('Admin logged in successfully', {
      userId: admin.id,
      email: admin.email,
      role: admin.role,
    });

    res.json({
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
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
