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
    const half = WORLD_SIZE / 2;
    expect(wrapVec3({ x: half + 1, y: -half - 1, z: 2 }, WORLD_SIZE)).toEqual({
      x: -half + 1,
      y: half - 1,
      z: 2
    });
  });

  it('wraps two axes in the same update', () => {
    const half = WORLD_SIZE / 2;
    expect(wrapVec3({ x: half + 0.5, y: 0, z: -half - 0.5 }, WORLD_SIZE)).toEqual({
      x: -half + 0.5,
      y: 0,
      z: half - 0.5
    });
  });

  it('wraps three axes in the same update', () => {
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

  it('keeps ordinary Euclidean distance when no wrap is shorter', () => {
    expect(toroidalDistanceSq(
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 2, z: 0 },
      WORLD_SIZE
    )).toBeCloseTo(8);
  });
});
