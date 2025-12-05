import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * PII Guard Middleware for Veterinary Clinic
 * Note: Veterinary uses PIPEDA (Canada), not PHIPA (Ontario healthcare)
 * Still enforces CANADA_PHIPA_READY flag for consistency across the system
 *
 * TODO(privacy): Privacy officer must review before enabling PII storage
 */
export function phiGuard(req: Request, res: Response, next: NextFunction): void {
  const phipaReady = process.env.CANADA_PHIPA_READY === 'true';

  // Check if request body contains attempts to store real owner/pet data
  if (req.body?.petOwner?.isReal === true && !phipaReady) {
    logger.warn('PII Guard: Blocked attempt to store real pet owner data', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    res.status(403).json({
      error: 'PII storage not enabled',
      message: 'CANADA_PHIPA_READY must be true and security checklist must be completed before storing real data.',
      details: 'See security/REVIEW_REQUIRED.md for manual approval steps.',
    });
    return;
  }

  // Log PII-related operations when flag is disabled
  if (!phipaReady && req.path.includes('/owner')) {
    logger.info('PII operation in safe mode (synthetic data only)', {
      path: req.path,
      method: req.method,
    });
  }

  next();
}

/**
 * Check if PII storage is enabled
 */
export function isPiiEnabled(): boolean {
  return process.env.CANADA_PHIPA_READY === 'true';
}
