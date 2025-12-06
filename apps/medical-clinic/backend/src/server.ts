import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory first, then from monorepo root
dotenv.config(); // backend/.env
// Walk up from backend to find root .env
const rootEnvPath = path.resolve(process.cwd(), '../../../.env');
dotenv.config({ path: rootEnvPath });

import app from './app';
import logger from './utils/logger';
import { PrismaClient } from '@prisma/client';

const PORT = process.env.PORT || 3080;
const prisma = new PrismaClient();

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // Check PHI mode
    const phipaReady = process.env.CANADA_PHIPA_READY === 'true';
    if (phipaReady) {
      logger.warn('⚠️  CANADA_PHIPA_READY=true: PHI storage enabled');
      logger.warn('⚠️  Ensure security checklist is complete before production use');
    } else {
      logger.info('✅ CANADA_PHIPA_READY=false: Safe mode (synthetic data only)');
    }

    // Log adapter configuration
    logger.info('Adapter configuration:', {
      pos: process.env.POS_ADAPTER || 'mock',
      notification: process.env.NOTIFICATION_ADAPTER || 'mock',
    });

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server started on port ${PORT}`);
      logger.info(`📚 API documentation: http://localhost:${PORT}/docs`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/health`);

      // Log default credentials in development
      if (process.env.NODE_ENV === 'development') {
        console.log('\n🔐 Default Login Credentials:');
        console.log('   Admin: admin@ildertonhealth-demo.ca / Admin123!');
        console.log('   Staff: staff@ildertonhealth-demo.ca / Staff123!\n');
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
