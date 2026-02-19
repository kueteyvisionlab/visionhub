import { describe, it, expect } from 'vitest';
import { parsePaginationParams, buildPaginationMeta } from './pagination';

describe('parsePaginationParams', () => {
  it('returns defaults when no params provided', () => {
    const result = parsePaginationParams({});
    expect(result).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it('parses valid page and limit', () => {
    const result = parsePaginationParams({ page: '3', limit: '10' });
    expect(result).toEqual({ page: 3, limit: 10, offset: 20 });
  });

  it('clamps page to 1 when negative or zero', () => {
    expect(parsePaginationParams({ page: '0' }).page).toBe(1);
    expect(parsePaginationParams({ page: '-5' }).page).toBe(1);
  });

  it('clamps limit to MAX_LIMIT (100)', () => {
    const result = parsePaginationParams({ limit: '500' });
    expect(result.limit).toBe(100);
  });

  it('defaults limit when invalid', () => {
    expect(parsePaginationParams({ limit: 'abc' }).limit).toBe(20);
    expect(parsePaginationParams({ limit: '0' }).limit).toBe(20);
  });

  it('floors decimal values', () => {
    const result = parsePaginationParams({ page: '2.9', limit: '15.7' });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(15);
    expect(result.offset).toBe(15); // (2-1)*15
  });

  it('calculates offset correctly', () => {
    const result = parsePaginationParams({ page: '5', limit: '25' });
    expect(result.offset).toBe(100); // (5-1)*25
  });
});

describe('buildPaginationMeta', () => {
  it('builds correct meta for normal case', () => {
    const meta = buildPaginationMeta(1, 20, 55);
    expect(meta).toEqual({
      page: 1,
      limit: 20,
      total: 55,
      total_pages: 3,
    });
  });

  it('returns total_pages=1 for 0 records', () => {
    const meta = buildPaginationMeta(1, 20, 0);
    expect(meta.total_pages).toBe(1);
  });

  it('calculates exact page count', () => {
    const meta = buildPaginationMeta(1, 10, 100);
    expect(meta.total_pages).toBe(10);
  });

  it('rounds up partial pages', () => {
    const meta = buildPaginationMeta(1, 10, 101);
    expect(meta.total_pages).toBe(11);
  });
});
