import request from 'supertest';
import express from 'express';

// Mock bcrypt before importing auth routes
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

// Mock Prisma before importing auth routes
const mockFindUnique = jest.fn();
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: mockFindUnique,
    },
  })),
}));

// Mock AuditService before importing auth routes
jest.mock('../../services/auditService', () => ({
  AuditService: {
    log: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock rate limiting before importing auth routes
jest.mock('../../middleware/rateLimit', () => ({
  authRateLimit: (_req: any, _res: any, next: any) => next(),
}));

// Now import the modules after mocks are set up
import bcrypt from 'bcrypt';
import authRoutes from '../auth';

describe('Auth Routes', () => {
  let app: express.Application;

  const testUser = {
    id: 'user-uuid-123',
    email: 'admin@ildertonhealth-demo.ca',
    password: '$2b$10$test-hashed-password',
    name: 'Clinic Admin',
    role: 'admin',
    isActive: true,
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
      mockFindUnique.mockResolvedValue(testUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@ildertonhealth-demo.ca',
          password: 'Admin123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('admin@ildertonhealth-demo.ca');
      expect(response.body.user.role).toBe('admin');
    });

    it('should login with password containing exclamation mark (!)', async () => {
      mockFindUnique.mockResolvedValue(testUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@ildertonhealth-demo.ca',
          password: 'Admin123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should login with password containing multiple special characters', async () => {
      mockFindUnique.mockResolvedValue(testUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@ildertonhealth-demo.ca',
          password: 'P@ssw0rd!#$%^&*()',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should reject login with incorrect password', async () => {
      mockFindUnique.mockResolvedValue(testUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@ildertonhealth-demo.ca',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
      mockFindUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Admin123!',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login with inactive user', async () => {
      mockFindUnique.mockResolvedValue({
        ...testUser,
        isActive: false,
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@ildertonhealth-demo.ca',
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
          email: 'admin@ildertonhealth-demo.ca',
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

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('should handle password with backslash as wrong password', async () => {
      mockFindUnique.mockResolvedValue(testUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@ildertonhealth-demo.ca',
          password: 'Admin123\\!',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should handle various special characters in password attempts', async () => {
      mockFindUnique.mockResolvedValue(testUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const specialPasswords = [
        'Test!@#$%^&*()',
        'Test<>?:"{}',
        "Test'`~",
        'Test\n\t',
        'Test with spaces',
        'Test\u00e9\u00e8\u00ea',
      ];

      for (const password of specialPasswords) {
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: 'admin@ildertonhealth-demo.ca',
            password,
          });

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
          email: 'admin@ildertonhealth-demo.ca',
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
