import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import logger from './utils/logger';
import { phiGuard } from './middleware/phiGuard';

// Import routes
import authRoutes from './routes/auth';
import providersRoutes from './routes/public/providers';
import appointmentTypesRoutes from './routes/public/appointmentTypes';
import availabilityRoutes from './routes/public/availability';
import bookingsRoutes from './routes/public/bookings';
import patientBookingsRoutes from './routes/patient/bookings';
import accountFamilyMembersRoutes from './routes/account/familyMembers';
import accountBookingsRoutes from './routes/account/bookings';
import adminBookingsRoutes from './routes/admin/bookings';
import adminAuditLogsRoutes from './routes/admin/auditLogs';
import adminReportsRoutes from './routes/admin/reports';
import chatRoutes from './routes/chat';

// Clerk middleware
import { clerkAuth } from './middleware/clerkAuth';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - allow any origin in development for LAN access
const isDev = process.env.NODE_ENV !== 'production';
app.use(cors({
  origin: isDev ? true : (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
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

// PHI Guard - enforce CANADA_PHIPA_READY flag
app.use(phiGuard);

// Clerk auth middleware (attaches auth state to request for patient routes)
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
      title: 'Ontario OAB API',
      version: '1.0.0',
      description: 'Online Appointment Booking API for Ontario Medical Clinics',
      contact: {
        name: 'API Support',
        email: 'support@ildertonhealth-demo.ca',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 8080}`,
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
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path: { type: 'array', items: { type: 'string' } },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        Provider: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            fullName: { type: 'string' },
            credentials: { type: 'string' },
            specialty: { type: 'string' },
            team: { type: 'string' },
            rosterStatus: { type: 'string', enum: ['open', 'closed'] },
            acceptsNewPatients: { type: 'boolean' },
            bio: { type: 'string' },
            photoUrl: { type: 'string' },
            workingHours: { type: 'object' },
          },
        },
        AppointmentType: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            duration: { type: 'integer', description: 'Duration in minutes' },
            description: { type: 'string' },
            isCommon: { type: 'boolean' },
          },
        },
        TimeSlot: {
          type: 'object',
          properties: {
            time: { type: 'string', example: '09:00' },
            available: { type: 'boolean' },
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
            provider: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
            },
            appointmentType: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                duration: { type: 'integer' },
              },
            },
          },
        },
        AdminBooking: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            date: { type: 'string', format: 'date' },
            time: { type: 'string' },
            modality: { type: 'string' },
            status: { type: 'string' },
            reason: { type: 'string' },
            provider: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
            patient: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                fakeMrn: { type: 'string' },
              },
            },
            appointmentType: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                duration: { type: 'integer' },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string' },
            userRole: { type: 'string' },
            action: { type: 'string' },
            resource: { type: 'string' },
            resourceId: { type: 'string' },
            ipAddress: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        FamilyMember: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            dateOfBirth: { type: 'string', format: 'date' },
            relationship: {
              type: 'string',
              enum: ['self', 'child', 'spouse', 'parent', 'sibling', 'grandparent', 'guardian', 'other'],
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'nonbinary', 'prefer_not_to_say'],
            },
            postalCode: { type: 'string' },
            chronicConditions: { type: 'array', items: { type: 'string' } },
            allergies: { type: 'array', items: { type: 'string' } },
            canSelfConsent: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        FamilyMemberBooking: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            date: { type: 'string', format: 'date' },
            time: { type: 'string' },
            modality: { type: 'string', enum: ['in-person', 'video', 'phone'] },
            status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'] },
            reason: { type: 'string' },
            notes: { type: 'string' },
            familyMember: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                relationship: { type: 'string' },
              },
            },
            provider: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                specialty: { type: 'string' },
              },
            },
            appointmentType: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                duration: { type: 'integer' },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
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
    phipaReady: process.env.CANADA_PHIPA_READY === 'true',
    adapters: {
      pos: process.env.POS_ADAPTER || 'mock',
      notification: process.env.NOTIFICATION_ADAPTER || 'mock',
    },
  });
});

// Public routes
app.use('/auth', authRoutes);
app.use('/providers', providersRoutes);
app.use('/appointment-types', appointmentTypesRoutes);
app.use('/availability', availabilityRoutes);
app.use('/bookings', bookingsRoutes);

// Patient routes (Clerk auth required) - Legacy
app.use('/patient', patientBookingsRoutes);

// Account routes (Clerk auth required) - New Account → FamilyMember model
app.use('/account/family-members', accountFamilyMembersRoutes);
app.use('/account/bookings', accountBookingsRoutes);

// Admin routes
app.use('/admin/bookings', adminBookingsRoutes);
app.use('/admin/audit-logs', adminAuditLogsRoutes);
app.use('/admin/reports', adminReportsRoutes);

// Chat route (AI assistant)
app.use('/chat', chatRoutes);

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
