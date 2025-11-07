import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * PHI Guard Middleware
 * Enforces CANADA_PHIPA_READY flag to prevent accidental PHI storage
 *
 * TODO(privacy): Privacy officer must review PIA before enabling PHI storage
 */
export function phiGuard(req: Request, res: Response, next: NextFunction) {
  const phipaReady = process.env.CANADA_PHIPA_READY === 'true';

  // Check if request body contains attempts to store real patient data
  if (req.body?.patient?.isReal === true && !phipaReady) {
    logger.warn('PHI Guard: Blocked attempt to store real patient data', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    return res.status(403).json({
      error: 'PHI storage not enabled',
      message: 'CANADA_PHIPA_READY must be true and security checklist must be completed before storing real patient data.',
      details: 'See security/REVIEW_REQUIRED.md for manual approval steps.',
    });
  }

  // Log PHI-related operations when flag is disabled
  if (!phipaReady && req.path.includes('/patient')) {
    logger.info('PHI operation in safe mode (synthetic data only)', {
      path: req.path,
      method: req.method,
    });
  }

  next();
}

/**
 * Check if PHI storage is enabled
 */
export function isPhiEnabled(): boolean {
  return process.env.CANADA_PHIPA_READY === 'true';
}
