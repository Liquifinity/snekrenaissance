import { describe, expect, test } from 'vitest';
import {
  normalizeUsername,
  validatePlayerId,
  validateResultRequest,
  validateSessionAge,
  validateStartRequest
} from '../src/validation';

describe('ranked identity validation', () => {
  test('accepts duplicate Unicode usernames and normalizes NFC', () => {
    const decomposed = '  Re\u0301n  ';
    expect(normalizeUsername(decomposed)).toBe('Rén');
    expect(normalizeUsername(decomposed)).toBe('Rén');
  });

  test('rejects blank, over-24-code-point, and control-character usernames', () => {
    expect(() => normalizeUsername('   ')).toThrow();
    expect(() => normalizeUsername('a'.repeat(25))).toThrow();
    expect(() => normalizeUsername('ren\u0000ato')).toThrow();
    expect(() => normalizeUsername('ren\u0085ato')).toThrow();
  });

  test('validates anonymous player IDs without accepting whitespace, paths, or HTML', () => {
    expect(validatePlayerId('550e8400-e29b-41d4-a716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    );
    expect(validatePlayerId('snek-mh8abc-xyz_123:local')).toBe('snek-mh8abc-xyz_123:local');
    expect(() => validatePlayerId(' player ')).toThrow();
    expect(() => validatePlayerId('../player')).toThrow();
    expect(() => validatePlayerId('<script>')).toThrow();
  });

  test('normalizes start requests', () => {
    expect(validateStartRequest({
      playerId: 'player-1',
      username: '  João  '
    })).toEqual({ playerId: 'player-1', username: 'João' });
  });
});

describe('ranked score validation', () => {
  const valid = {
    playerId: 'player-1',
    username: 'ren',
    maxLength: 16,
    foodEaten: 1,
    durationMs: 1_000
  };

  test('requires finite non-negative integers and exact 12 + food*4 growth', () => {
    expect(validateResultRequest(valid, 1_000)).toEqual(valid);
    expect(() => validateResultRequest({ ...valid, foodEaten: 1.5 }, 1_000)).toThrow();
    expect(() => validateResultRequest({ ...valid, maxLength: Number.NaN }, 1_000)).toThrow();
    expect(() => validateResultRequest({ ...valid, durationMs: -1 }, 1_000)).toThrow();
    expect(() => validateResultRequest({ ...valid, maxLength: 17 }, 1_000)).toThrow();
  });

  test('caps food count and rejects physically implausible active duration', () => {
    expect(() => validateResultRequest({
      ...valid,
      foodEaten: 10_001,
      maxLength: 12 + 10_001 * 4,
      durationMs: 3_000_000
    }, 3_000_000)).toThrow();

    expect(() => validateResultRequest({
      ...valid,
      foodEaten: 5,
      maxLength: 32,
      durationMs: 999
    }, 1_000)).toThrow();
  });

  test('allows long hidden-tab wall time but not client time more than 5s ahead', () => {
    expect(validateResultRequest(valid, 3 * 60 * 60 * 1_000)).toEqual(valid);
    expect(() => validateResultRequest({ ...valid, durationMs: 6_001 }, 1_000)).toThrow();
    expect(validateResultRequest({ ...valid, durationMs: 6_000 }, 1_000)).toEqual({
      ...valid,
      durationMs: 6_000
    });
  });

  test('expires sessions only after six hours', () => {
    expect(() => validateSessionAge(6 * 60 * 60 * 1_000)).not.toThrow();
    expect(() => validateSessionAge(6 * 60 * 60 * 1_000 + 1)).toThrow();
    expect(() => validateSessionAge(-1)).toThrow();
  });
});
