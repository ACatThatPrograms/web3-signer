export class AppError extends Error {
    public readonly status: number;
    public readonly isOperational: boolean;
  
    constructor(message: string, status: number = 500, isOperational: boolean = true) {
      super(message);
      this.status = status;
      this.isOperational = isOperational;
  
      Object.setPrototypeOf(this, AppError.prototype);
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  export const ErrorMessages = {
    UNAUTHORIZED: 'Authentication required',
    INVALID_SIGNATURE: 'Invalid signature',
    USER_NOT_FOUND: 'User not found',
    MESSAGE_NOT_FOUND: 'Message not found',
    INVALID_MFA_CODE: 'Invalid MFA code',
    MFA_TIMEOUT: 'MFA window expired. Please login again.',
    MFA_NOT_ENABLED: 'MFA is not enabled for this account',
    MFA_ALREADY_ENABLED: 'MFA is already enabled for this account',
    SESSION_EXPIRED: 'Session has expired. Please login again.',
    INVALID_REQUEST: 'Invalid request format',
    INTERNAL_ERROR: 'An internal error occurred'
  } as const;
  
  export function handlePrismaError(error: any): AppError {
    if (error.code === 'P2002') {
      return new AppError('A record with this value already exists', 409);
    }
    if (error.code === 'P2025') {
      return new AppError('Record not found', 404);
    }
    if (error.code === 'P2003') {
      return new AppError('Foreign key constraint failed', 400);
    }
    
    return new AppError(ErrorMessages.INTERNAL_ERROR, 500);
  }
  
  export function asyncHandler(fn: Function) {
    return (req: any, res: any, next: any) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }