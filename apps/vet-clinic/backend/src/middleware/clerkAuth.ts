import { Request, Response, NextFunction } from 'express';
import { clerkClient, clerkMiddleware, getAuth, requireAuth } from '@clerk/express';
import logger from '../utils/logger';

/**
 * Pet owner info extracted from Clerk auth
 */
export interface ClerkPetOwner {
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
      clerkPetOwner?: ClerkPetOwner;
    }
  }
}

// Check if Clerk is configured
const isClerkConfigured = (): boolean => {
  return !!(process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
};

/**
 * Clerk middleware that attaches auth state to request
 * Use this at app level to enable Clerk auth checking
 * Gracefully skips if Clerk is not configured
 */
export const clerkAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!isClerkConfigured()) {
    // Skip Clerk middleware if not configured
    next();
    return;
  }
  clerkMiddleware()(req, res, next);
};

/**
 * Require pet owner to be signed in via Clerk
 * Returns 401 if not authenticated, or skips if Clerk not configured
 */
export const requirePetOwner = (req: Request, res: Response, next: NextFunction): void => {
  if (!isClerkConfigured()) {
    // Skip auth requirement if Clerk not configured (dev mode)
    logger.warn('Clerk not configured - skipping pet owner auth requirement');
    next();
    return;
  }
  requireAuth()(req, res, next);
};

/**
 * Extract pet owner info from Clerk auth and attach to request
 * Must be used after clerkMiddleware or requireAuth
 */
export async function extractPetOwnerInfo(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const auth = getAuth(req);

    if (!auth?.userId) {
      next();
      return;
    }

    // Get full user details from Clerk
    const user = await clerkClient.users.getUser(auth.userId);

    req.clerkPetOwner = {
      clerkUserId: user.id,
      email: user.emailAddresses?.[0]?.emailAddress,
      phone: user.phoneNumbers?.[0]?.phoneNumber,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
    };

    logger.debug('Clerk pet owner extracted', {
      clerkUserId: user.id,
      hasEmail: !!req.clerkPetOwner.email,
    });

    next();
  } catch (error) {
    logger.error('Failed to extract Clerk pet owner info', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(error);
  }
}

/**
 * Get pet owner info from request (after middleware has run)
 */
export function getPetOwnerFromClerk(req: Request): ClerkPetOwner | null {
  return req.clerkPetOwner || null;
}

/**
 * Middleware that requires pet owner auth and extracts info
 * Combination of requirePetOwner + extractPetOwnerInfo
 */
export function requirePetOwnerWithInfo(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // First check if authenticated
  const auth = getAuth(req);

  if (!auth?.userId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Pet owner authentication required. Please sign in.',
    });
    return;
  }

  // Then extract pet owner info
  extractPetOwnerInfo(req, res, next);
}
