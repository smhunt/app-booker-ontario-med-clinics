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
import availabilityRoutes from './routes/public/availability';
import bookingsRoutes from './routes/public/bookings';
import adminBookingsRoutes from './routes/admin/bookings';
import adminAuditLogsRoutes from './routes/admin/auditLogs';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PHI Guard - enforce CANADA_PHIPA_READY flag
app.use(phiGuard);

// Request logging
app.use((req, res, next) => {
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
    },
  },
  apis: ['./src/routes/**/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
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
app.use('/availability', availabilityRoutes);
app.use('/bookings', bookingsRoutes);

// Admin routes
app.use('/admin/bookings', adminBookingsRoutes);
app.use('/admin/audit-logs', adminAuditLogsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
