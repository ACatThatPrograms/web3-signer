// types/index.ts
import { Request } from 'express';
import { Session } from 'express-session';

// Extend Express Request type with our session data
export interface AuthenticatedRequest extends Request {
  session: Session & {
    userId?: number;
    address?: string;
    pendingUserId?: number;
    mfaBonusPhrase?: string;
  };
}

// Response types
export interface ApiResponse<T = any> {
  success: boolean;
  status: number;
  error?: string;
  data?: T;
}

export interface UserResponse {
  id: number;
  address: string;
  role: string;
  mfa?: boolean;
}

export interface MessageResponse {
  id: number;
  message: string;
  signature: string;
  signer: string;
  valid: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface VerifySignatureResponse {
  isValid: boolean;
  signer: string;
  originalMessage: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Declare session types for TypeScript
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    address?: string;
    pendingUserId?: number;
    mfaBonusPhrase?: string;
  }
}