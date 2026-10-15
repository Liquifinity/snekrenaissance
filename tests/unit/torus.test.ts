import { describe, expect, it } from 'vitest';
import { WORLD_SIZE } from '../../src/game/constants';
import { shortestWrappedDelta, toroidalDistanceSq, wrapScalar, wrapVec3 } from '../../src/game/torus';

describe('toroidal world math', () => {
  it('wraps scalar values at positive and negative faces into [-L/2, L/2)', () => {
    expect(wrapScalar(8, 16)).toBe(-8);
    expect(wrapScalar(8.25, 16)).toBeCloseTo(-7.75);
    expect(wrapScalar(-8, 16)).toBe(-8);
    expect(wrapScalar(-8.25, 16)).toBeCloseTo(7.75);
  });

  it('wraps x, y and z independently', () => {
    expect(wrapVec3({ x: 9, y: -9, z: 2 }, WORLD_SIZE)).toEqual({ x: -7, y: 7, z: 2 });
  });

  it('wraps two axes in the same update', () => {
    expect(wrapVec3({ x: 8.5, y: 0, z: -8.5 }, WORLD_SIZE)).toEqual({ x: -7.5, y: 0, z: 7.5 });
  });

  it('wraps three axes in the same update', () => {
    expect(wrapVec3({ x: 9, y: 10, z: -11 }, WORLD_SIZE)).toEqual({ x: -7, y: -6, z: 5 });
  });

  it('returns the shortest signed delta across opposite faces', () => {
    expect(shortestWrappedDelta(7.5, -7.5, WORLD_SIZE)).toBeCloseTo(1);
    expect(shortestWrappedDelta(-7.5, 7.5, WORLD_SIZE)).toBeCloseTo(-1);
  });

  it('computes toroidal squared distance across a boundary', () => {
    expect(toroidalDistanceSq(
      { x: 7.5, y: 0, z: 0 },
      { x: -7.5, y: 0, z: 0 },
      WORLD_SIZE
    )).toBeCloseTo(1);
  });

  it('keeps ordinary Euclidean distance when no wrap is shorter', () => {
    expect(toroidalDistanceSq(
      { x: 1, y: 2, z: 3 },
      { x: 4, y: 6, z: 3 },
      WORLD_SIZE
    )).toBeCloseTo(25);
  });
});
