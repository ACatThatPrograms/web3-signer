// middleware/auth.ts
import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({
      error: 'Authentication required',
      status: 401,
      success: false
    });
    return;
  }
  
  next();
}

export function optionalAuth(_req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  // This middleware doesn't block the request, just sets userId if available
  next();
}