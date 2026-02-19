import { describe, it, expect } from 'vitest';
import { ScoringService } from './scoring.service';

describe('ScoringService.getScoreLabel', () => {
  it('returns "hot" for scores >= 80', () => {
    expect(ScoringService.getScoreLabel(80)).toBe('hot');
    expect(ScoringService.getScoreLabel(100)).toBe('hot');
    expect(ScoringService.getScoreLabel(95)).toBe('hot');
  });

  it('returns "warm" for scores 50-79', () => {
    expect(ScoringService.getScoreLabel(50)).toBe('warm');
    expect(ScoringService.getScoreLabel(79)).toBe('warm');
    expect(ScoringService.getScoreLabel(65)).toBe('warm');
  });

  it('returns "cold" for scores < 50', () => {
    expect(ScoringService.getScoreLabel(0)).toBe('cold');
    expect(ScoringService.getScoreLabel(49)).toBe('cold');
    expect(ScoringService.getScoreLabel(25)).toBe('cold');
  });
});
