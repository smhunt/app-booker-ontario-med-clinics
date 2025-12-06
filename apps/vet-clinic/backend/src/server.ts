import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import logger from './utils/logger';
import { PrismaClient } from './generated/prisma';

const PORT = process.env.PORT || 8081;
const prisma = new PrismaClient();

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Check PII mode (using same flag for consistency)
    const phipaReady = process.env.CANADA_PHIPA_READY === 'true';
    if (phipaReady) {
      logger.warn('CANADA_PHIPA_READY=true: PII storage enabled');
      logger.warn('Ensure security checklist is complete before production use');
    } else {
      logger.info('CANADA_PHIPA_READY=false: Safe mode (synthetic data only)');
    }

    // Log adapter configuration
    logger.info('Adapter configuration:', {
      pos: process.env.POS_ADAPTER || 'mock',
      notification: process.env.NOTIFICATION_ADAPTER || 'mock',
    });

    // Start server
    app.listen(PORT, () => {
      logger.info(`Vet Clinic API started on port ${PORT}`);
      logger.info(`API documentation: http://localhost:${PORT}/docs`);
      logger.info(`Health check: http://localhost:${PORT}/health`);

      // Log default credentials in development
      if (process.env.NODE_ENV === 'development') {
        console.log('\nDefault Login Credentials:');
        console.log('   Admin: admin@vetclinic-demo.ca / Admin123!');
        console.log('   Staff: staff@vetclinic-demo.ca / Staff123!\n');
      }
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
