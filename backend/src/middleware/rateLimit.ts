import rateLimit from 'express-rate-limit';

/**
 * Rate limiting for public endpoints
 * Prevents abuse and DoS attempts
 */
export const publicRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000'), // 1 hour default
  max: parseInt(process.env.RATE_LIMIT_REQUESTS || '100'), // 100 requests per window
  message: {
    error: 'Too many requests',
    message: 'Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stricter rate limit for authentication endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 attempts per window (relaxed for development/testing)
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again in 15 minutes',
  },
});
