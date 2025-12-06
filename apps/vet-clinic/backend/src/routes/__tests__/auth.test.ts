import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import authRoutes from '../auth';

// Mock Prisma
jest.mock('../../generated/prisma', () => {
  const mockAdmin = {
    findUnique: jest.fn(),
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      admin: mockAdmin,
    })),
  };
});

// Mock AuditService
jest.mock('../../services/auditService', () => ({
  AuditService: {
    log: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock rate limiting for tests
jest.mock('../../middleware/rateLimit', () => ({
  authRateLimit: (_req: any, _res: any, next: any) => next(),
}));

import { PrismaClient } from '../../generated/prisma';

const prisma = new PrismaClient();

describe('Auth Routes', () => {
  let app: express.Application;

  const testAdmin = {
    id: 'admin-uuid-123',
    email: 'admin@vetclinic-demo.ca',
    password: '$2b$10$test-hashed-password', // Will be mocked
    name: 'Vet Admin',
    role: 'admin',
  };

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    // Add JSON error handler (same as in app.ts)
    app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (err instanceof SyntaxError && 'body' in err) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid JSON in request body',
        });
        return;
      }
      next(err);
    });

    app.use('/auth', authRoutes);
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      (prisma.admin.findUnique as jest.Mock).mockResolvedValue(testAdmin);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@vetclinic-demo.ca',
          password: 'Admin123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('admin@vetclinic-demo.ca');
      expect(response.body.user.role).toBe('admin');
    });

    it('should login with password containing exclamation mark (!)', async () => {
      (prisma.admin.findUnique as jest.Mock).mockResolvedValue(testAdmin);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@vetclinic-demo.ca',
          password: 'Admin123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should login with password containing multiple special characters', async () => {
      (prisma.admin.findUnique as jest.Mock).mockResolvedValue(testAdmin);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@vetclinic-demo.ca',
          password: 'P@ssw0rd!#$%^&*()',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should reject login with incorrect password', async () => {
      (prisma.admin.findUnique as jest.Mock).mockResolvedValue(testAdmin);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@vetclinic-demo.ca',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
      (prisma.admin.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Admin123!',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login with invalid email format', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'not-an-email',
          password: 'Admin123!',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid input');
    });

    it('should reject login with password too short', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@vetclinic-demo.ca',
          password: '12345',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid input');
    });

    it('should handle malformed JSON gracefully with 400 status', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email":"test@test.com","password":"Admin123\\!"}');

      // Should return 400 for malformed JSON, not 500
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('should handle password with backslash as wrong password', async () => {
      (prisma.admin.findUnique as jest.Mock).mockResolvedValue(testAdmin);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@vetclinic-demo.ca',
          password: 'Admin123\\!', // Wrong password with backslash
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should handle various special characters in password attempts', async () => {
      (prisma.admin.findUnique as jest.Mock).mockResolvedValue(testAdmin);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      const specialPasswords = [
        'Test!@#$%^&*()',
        'Test<>?:"{}',
        "Test'`~",
        'Test\n\t',
        'Test with spaces',
        'Test\u00e9\u00e8\u00ea', // French accents
      ];

      for (const password of specialPasswords) {
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: 'admin@vetclinic-demo.ca',
            password,
          });

        // Should return 401 (wrong password) not 500
        expect(response.status).toBe(401);
      }
    });

    it('should reject missing email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          password: 'Admin123!',
        });

      expect(response.status).toBe(400);
    });

    it('should reject missing password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@vetclinic-demo.ca',
        });

      expect(response.status).toBe(400);
    });

    it('should reject empty body', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });
  });
});
