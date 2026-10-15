import { describe, expect, it } from 'vitest';
import { TrailBuffer, sampleTrailAtDistance } from '../../src/game/trail';

describe('TrailBuffer', () => {
  it('interpolates a point at a fixed distance behind the newest sample', () => {
    const trail = new TrailBuffer({ x: 0, y: 0, z: 0 });
    trail.push({ x: 0, y: 0, z: 1 });
    trail.push({ x: 0, y: 0, z: 2 });
    trail.push({ x: 0, y: 0, z: 3 });

    expect(sampleTrailAtDistance(trail, 0.5)).toEqual({ x: 0, y: 0, z: 2.5 });
  });

  it('samples correctly across multiple path segments', () => {
    const trail = new TrailBuffer({ x: 0, y: 0, z: 0 });
    trail.push({ x: 2, y: 0, z: 0 });
    trail.push({ x: 2, y: 3, z: 0 });

    expect(sampleTrailAtDistance(trail, 4)).toEqual({ x: 1, y: 0, z: 0 });
  });

  it('keeps unwrapped coordinates continuous across a visible cube wrap', () => {
    const trail = new TrailBuffer({ x: 0, y: 0, z: 7.9 });
    trail.push({ x: 0, y: 0, z: 8.1 });

    expect(sampleTrailAtDistance(trail, 0.1).z).toBeCloseTo(8.0);
  });

  it('returns the oldest point when requested distance exceeds recorded trail', () => {
    const trail = new TrailBuffer({ x: 1, y: 2, z: 3 });
    trail.push({ x: 2, y: 2, z: 3 });
    expect(sampleTrailAtDistance(trail, 100)).toEqual({ x: 1, y: 2, z: 3 });
  });
});
