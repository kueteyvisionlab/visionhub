import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Structured application error that can carry an HTTP status code and
 * a machine-readable error code alongside the human-readable message.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Convenience factory functions
export const notFound = (resource: string) =>
  new AppError(`${resource} not found`, 404, 'NOT_FOUND');

export const badRequest = (message: string, details?: unknown) =>
  new AppError(message, 400, 'BAD_REQUEST', details);

export const unauthorized = (message = 'Unauthorized') =>
  new AppError(message, 401, 'UNAUTHORIZED');

export const forbidden = (message = 'Forbidden') =>
  new AppError(message, 403, 'FORBIDDEN');

export const conflict = (message: string) =>
  new AppError(message, 409, 'CONFLICT');

/**
 * Catch-all 404 handler for routes that do not exist.
 * Mount this AFTER all route registrations.
 */
export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
}

/**
 * Global error-handling middleware.
 * Express recognises 4-argument middleware as error handlers.
 */
export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Determine status and code
  const statusCode = (err as AppError).statusCode ?? 500;
  const code = (err as AppError).code ?? 'INTERNAL_ERROR';
  const isOperational = (err as AppError).isOperational ?? false;

  // Always log server errors
  if (statusCode >= 500) {
    logger.error('Unhandled server error', {
      message: err.message,
      stack: err.stack,
      code,
    });
  } else {
    logger.warn('Client error', { message: err.message, code, statusCode });
  }

  // Build the response payload
  const isProduction = env.NODE_ENV === 'production';
  const details = isProduction && !isOperational ? undefined : (err as AppError).details;

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: isProduction && !isOperational ? 'An unexpected error occurred' : err.message,
      ...(details !== undefined && { details }),
      ...((!isProduction && err.stack) && { stack: err.stack }),
    },
  });
}
