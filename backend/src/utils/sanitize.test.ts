import { describe, it, expect } from 'vitest';
import { sanitizeForAudit } from './sanitize';

describe('sanitizeForAudit', () => {
  it('returns null for null/undefined inputs', () => {
    expect(sanitizeForAudit(null)).toBeNull();
    expect(sanitizeForAudit(undefined)).toBeNull();
  });

  it('passes through primitive values unchanged', () => {
    expect(sanitizeForAudit(42)).toBe(42);
    expect(sanitizeForAudit(true)).toBe(true);
    expect(sanitizeForAudit('hello')).toBe('hello');
  });

  it('truncates strings longer than 1000 characters', () => {
    const longString = 'a'.repeat(1500);
    const result = sanitizeForAudit(longString);
    expect(result).toHaveLength(1000 + '...[truncated]'.length);
    expect(result).toContain('...[truncated]');
  });

  it('redacts sensitive keys in flat objects', () => {
    const input = {
      name: 'John',
      password: 'secret123',
      email: 'john@test.com',
      token: 'abc-token',
      api_key: 'key-123',
    };
    const result = sanitizeForAudit(input);
    expect(result.name).toBe('John');
    expect(result.email).toBe('john@test.com');
    expect(result.password).toBe('[REDACTED]');
    expect(result.token).toBe('[REDACTED]');
    expect(result.api_key).toBe('[REDACTED]');
  });

  it('redacts keys containing sensitive substrings', () => {
    const input = {
      userPassword: 'secret',
      Authorization: 'Bearer xyz',
      myApiKey: 'key',       // 'myapikey' does NOT contain 'api_key' or 'apiKey'
      user_api_key: 'key2',  // 'user_api_key' contains 'api_key'
    };
    const result = sanitizeForAudit(input);
    expect(result.userPassword).toBe('[REDACTED]');
    expect(result.Authorization).toBe('[REDACTED]');
    expect(result.myApiKey).toBe('key');           // not redacted (camelCase mismatch after lowercase)
    expect(result.user_api_key).toBe('[REDACTED]'); // redacted (contains 'api_key')
  });

  it('handles nested objects recursively', () => {
    const input = {
      user: {
        name: 'Jane',
        credentials: { password: 'secret' },
      },
    };
    const result = sanitizeForAudit(input);
    expect(result.user.name).toBe('Jane');
    expect(result.user.credentials).toBe('[REDACTED]');
  });

  it('handles arrays recursively', () => {
    const input = [
      { name: 'Alice', token: 'abc' },
      { name: 'Bob', secret: 'xyz' },
    ];
    const result = sanitizeForAudit(input);
    expect(result[0].name).toBe('Alice');
    expect(result[0].token).toBe('[REDACTED]');
    expect(result[1].name).toBe('Bob');
    expect(result[1].secret).toBe('[REDACTED]');
  });

  it('truncates long string values inside objects', () => {
    const input = { description: 'x'.repeat(1500) };
    const result = sanitizeForAudit(input);
    expect(result.description).toContain('...[truncated]');
    expect(result.description.length).toBeLessThan(1500);
  });

  it('does not mutate the original object', () => {
    const input = { password: 'secret', name: 'test' };
    sanitizeForAudit(input);
    expect(input.password).toBe('secret');
  });
});
