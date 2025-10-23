import rateLimit from 'express-rate-limit';

// General rate limiter
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later',
    status: 429,
    success: false
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  message: {
    error: 'Too many authentication attempts, please try again later',
    status: 429,
    success: false
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// MFA limiter
export const mfaLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 MFA attempts per window
  message: {
    error: 'Too many MFA attempts, please try again later',
    status: 429,
    success: false
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Signature verification limiter
export const signatureLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 signature verifications per minute
  message: {
    error: 'Too many signature verification requests, please slow down',
    status: 429,
    success: false
  },
  standardHeaders: true,
  legacyHeaders: false,
});