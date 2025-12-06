import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import logger from './utils/logger';
import { phiGuard } from './middleware/phiGuard';

// Import routes
import authRoutes from './routes/auth';
import veterinariansRoutes from './routes/public/veterinarians';
import appointmentTypesRoutes from './routes/public/appointmentTypes';
import availabilityRoutes from './routes/public/availability';
import bookingsRoutes from './routes/public/bookings';
import ownerPetsRoutes from './routes/owner/pets';
import ownerBookingsRoutes from './routes/owner/bookings';
import adminBookingsRoutes from './routes/admin/bookings';
import adminAuditLogsRoutes from './routes/admin/auditLogs';
import adminReportsRoutes from './routes/admin/reports';

// Clerk middleware
import { clerkAuth } from './middleware/clerkAuth';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - allow any origin in development for LAN access
const isDev = process.env.NODE_ENV !== 'production';
app.use(cors({
  origin: isDev ? true : (process.env.CORS_ORIGIN || 'http://localhost:3002').split(','),
  credentials: true,
}));

// Body parsing with error handling for malformed JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle JSON parse errors gracefully (return 400 instead of 500)
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn('Malformed JSON in request body', {
      path: req.path,
      method: req.method,
      error: err.message,
    });
    res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid JSON in request body',
    });
    return;
  }
  next(err);
});

// PII Guard - enforce CANADA_PHIPA_READY flag
app.use(phiGuard);

// Clerk auth middleware (attaches auth state to request for owner routes)
app.use(clerkAuth);

// Request logging
app.use((req, _res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Swagger/OpenAPI documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Veterinary Clinic OAB API',
      version: '1.0.0',
      description: 'Online Appointment Booking API for Veterinary Clinics',
      contact: {
        name: 'API Support',
        email: 'support@vetclinic-demo.ca',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 8081}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
        Veterinarian: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            displayName: { type: 'string' },
            specialty: { type: 'string' },
            team: { type: 'string' },
            acceptsNewClients: { type: 'boolean' },
            languages: { type: 'array', items: { type: 'string' } },
          },
        },
        AppointmentType: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            duration: { type: 'integer' },
            description: { type: 'string' },
            isCommon: { type: 'boolean' },
          },
        },
        Pet: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            species: { type: 'string', enum: ['dog', 'cat', 'bird', 'rabbit', 'reptile', 'other'] },
            breed: { type: 'string' },
            sex: { type: 'string' },
            weight: { type: 'number' },
            dateOfBirth: { type: 'string', format: 'date' },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            date: { type: 'string', format: 'date' },
            time: { type: 'string' },
            modality: { type: 'string', enum: ['in-person', 'video', 'phone'] },
            status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'] },
            reason: { type: 'string' },
            veterinarian: { type: 'object' },
            pet: { type: 'object' },
            appointmentType: { type: 'object' },
          },
        },
        TimeSlot: {
          type: 'object',
          properties: {
            time: { type: 'string' },
            available: { type: 'boolean' },
          },
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string' },
            action: { type: 'string' },
            resource: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/**/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'vet-clinic-backend',
    phipaReady: process.env.CANADA_PHIPA_READY === 'true',
    adapters: {
      pos: process.env.POS_ADAPTER || 'mock',
      notification: process.env.NOTIFICATION_ADAPTER || 'mock',
    },
  });
});

// Public routes
app.use('/auth', authRoutes);
app.use('/veterinarians', veterinariansRoutes);
app.use('/appointment-types', appointmentTypesRoutes);
app.use('/availability', availabilityRoutes);
app.use('/bookings', bookingsRoutes);

// Pet owner routes (Clerk auth required)
app.use('/owner/pets', ownerPetsRoutes);
app.use('/owner/bookings', ownerBookingsRoutes);

// Admin routes
app.use('/admin/bookings', adminBookingsRoutes);
app.use('/admin/audit-logs', adminAuditLogsRoutes);
app.use('/admin/reports', adminReportsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

export default app;
