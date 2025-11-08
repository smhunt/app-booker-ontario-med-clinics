import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Role-Based Access Control Middleware
 * Enforces role requirements on admin endpoints
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('RBAC: Access denied', {
        user: req.user.email,
        role: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
        ip: req.ip,
      });

      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Convenience middleware for admin-only routes
 */
export const requireAdmin = requireRole('admin');

/**
 * Convenience middleware for admin or clinic staff
 */
export const requireStaff = requireRole('admin', 'clinic_staff');
