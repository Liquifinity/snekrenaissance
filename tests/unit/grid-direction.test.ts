import { describe, expect, it } from 'vitest';
import { quantizeForwardToGridDirection } from '../../src/game/grid-direction';

describe('V2.2 cardinal visible direction quantization', () => {
  it.each([
    [{ x: 0.8, y: 0.2, z: 0.5 }, '+X'],
    [{ x: -0.8, y: 0.2, z: 0.5 }, '-X'],
    [{ x: 0.2, y: 0.9, z: 0.3 }, '+Y'],
    [{ x: 0.2, y: -0.9, z: 0.3 }, '-Y'],
    [{ x: 0.2, y: 0.3, z: 0.9 }, '+Z'],
    [{ x: 0.2, y: 0.3, z: -0.9 }, '-Z']
  ] as const)('selects the dominant signed axis for %o', (forward, expected) => {
    expect(quantizeForwardToGridDirection(forward)).toBe(expected);
  });

  it('uses deterministic X > Y > Z priority for exact magnitude ties', () => {
    expect(quantizeForwardToGridDirection({ x: 1, y: 1, z: 1 })).toBe('+X');
    expect(quantizeForwardToGridDirection({ x: -1, y: 1, z: 1 })).toBe('-X');
    expect(quantizeForwardToGridDirection({ x: 0, y: 1, z: 1 })).toBe('+Y');
    expect(quantizeForwardToGridDirection({ x: 0, y: -1, z: 1 })).toBe('-Y');
  });

  it.each([
    { x: Number.NaN, y: 0, z: 1 },
    { x: 0, y: Number.POSITIVE_INFINITY, z: 1 },
    { x: 0, y: 0, z: Number.NEGATIVE_INFINITY }
  ])('rejects non-finite vectors', (forward) => {
    expect(() => quantizeForwardToGridDirection(forward)).toThrow(RangeError);
  });
});
