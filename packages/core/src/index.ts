// Core package exports - shared functionality across all industries

// Middleware
export { authenticate, generateToken } from './middleware/auth';
export { requireRole } from './middleware/rbac';
export { rateLimitMiddleware } from './middleware/rateLimit';
export { phiGuard } from './middleware/phiGuard';

// Services
export { auditLog, queryAuditLogs } from './services/auditService';
export * from './services/bookingService';

// Utils
export { logger } from './utils/logger';
export { redactor } from './utils/redactor';

// Adapter factories
export { createPosAdapter, createNotificationAdapter } from './adapters/factory';

// Types (will be added as we extract them)
export * from './types';
