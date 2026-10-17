import { describe, expect, it } from 'vitest';
import { shortestWrappedDelta, toroidalDistanceSq, wrapScalar, wrapVec3 } from '../../src/game/torus';

const WORLD_SIZE = 4;

describe('toroidal presentation math', () => {
  it('wraps scalar values at positive and negative faces into [-L/2, L/2)', () => {
    expect(wrapScalar(8, 16)).toBe(-8);
    expect(wrapScalar(8.25, 16)).toBeCloseTo(-7.75);
    expect(wrapScalar(-8, 16)).toBe(-8);
    expect(wrapScalar(-8.25, 16)).toBeCloseTo(7.75);
  });

  it('wraps x, y and z independently', () => {
    const half = WORLD_SIZE / 2;
    expect(wrapVec3({ x: half + 1, y: -half - 1, z: 0 }, WORLD_SIZE)).toEqual({
      x: -half + 1,
      y: half - 1,
      z: 0
    });
  });

  it('wraps multiple axes in the same update', () => {
    const half = WORLD_SIZE / 2;
    expect(wrapVec3({ x: half + 1, y: half + 2, z: -half - 3 }, WORLD_SIZE)).toEqual({
      x: -half + 1,
      y: -half + 2,
      z: half - 3
    });
  });

  it('returns the shortest signed delta across opposite faces', () => {
    const half = WORLD_SIZE / 2;
    expect(shortestWrappedDelta(half - 0.5, -half + 0.5, WORLD_SIZE)).toBeCloseTo(1);
    expect(shortestWrappedDelta(-half + 0.5, half - 0.5, WORLD_SIZE)).toBeCloseTo(-1);
  });

  it('computes toroidal squared distance across a boundary', () => {
    const half = WORLD_SIZE / 2;
    expect(toroidalDistanceSq(
      { x: half - 0.5, y: 0, z: 0 },
      { x: -half + 0.5, y: 0, z: 0 },
      WORLD_SIZE
    )).toBeCloseTo(1);
  });
});
