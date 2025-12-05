import { Request, Response, NextFunction } from 'express';
import { clerkClient, ClerkExpressRequireAuth, ClerkExpressWithAuth } from '@clerk/express';
import logger from '../utils/logger';

/**
 * Patient info extracted from Clerk auth
 */
export interface ClerkPatient {
  clerkUserId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}

// Extend Express Request type for Clerk auth
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      clerkPatient?: ClerkPatient;
    }
  }
}

/**
 * Clerk middleware that attaches auth state to request
 * Use this at app level to enable Clerk auth checking
 */
export const clerkAuth = ClerkExpressWithAuth();

/**
 * Require patient to be signed in via Clerk
 * Returns 401 if not authenticated
 */
export const requirePatient = ClerkExpressRequireAuth();

/**
 * Extract patient info from Clerk auth and attach to request
 * Must be used after ClerkExpressWithAuth or ClerkExpressRequireAuth
 */
export async function extractPatientInfo(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // @ts-expect-error - Clerk types may not be fully compatible
    const auth = req.auth;

    if (!auth?.userId) {
      next();
      return;
    }

    // Get full user details from Clerk
    const user = await clerkClient.users.getUser(auth.userId);

    req.clerkPatient = {
      clerkUserId: user.id,
      email: user.emailAddresses?.[0]?.emailAddress,
      phone: user.phoneNumbers?.[0]?.phoneNumber,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
    };

    logger.debug('Clerk patient extracted', {
      clerkUserId: user.id,
      hasEmail: !!req.clerkPatient.email,
    });

    next();
  } catch (error) {
    logger.error('Failed to extract Clerk patient info', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(error);
  }
}

/**
 * Get patient info from request (after middleware has run)
 */
export function getPatientFromClerk(req: Request): ClerkPatient | null {
  return req.clerkPatient || null;
}

/**
 * Middleware that requires patient auth and extracts info
 * Combination of requirePatient + extractPatientInfo
 */
export function requirePatientWithInfo(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // First check if authenticated
  // @ts-expect-error - Clerk types
  const auth = req.auth;

  if (!auth?.userId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Patient authentication required. Please sign in.',
    });
    return;
  }

  // Then extract patient info
  extractPatientInfo(req, res, next);
}
