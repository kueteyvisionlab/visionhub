import { describe, it, expect } from 'vitest';
import { AppError } from './errorHandler';

describe('AppError', () => {
  it('creates an error with status and message', () => {
    const err = new AppError('Not found', 404);
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
  });

  it('defaults to 500 status code', () => {
    const err = new AppError('Internal error');
    expect(err.statusCode).toBe(500);
  });

  it('preserves stack trace', () => {
    const err = new AppError('Bad request', 400);
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('Bad request');
  });

  it('accepts a code parameter', () => {
    const err = new AppError('Forbidden', 403, 'FORBIDDEN');
    expect(err.code).toBe('FORBIDDEN');
  });

  it('is operational by default', () => {
    const err = new AppError('test');
    expect(err.isOperational).toBe(true);
  });
});
