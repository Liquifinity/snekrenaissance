import { describe, expect, it } from 'vitest';
import { TrailBuffer } from '../../src/game/trail';

describe('legacy TrailBuffer scalability during V2 migration', () => {
  it('batch-samples many retained distances directly from TrailBuffer', () => {
    const trail = new TrailBuffer({ x: 0, y: 0, z: 0 });
    for (let step = 1; step <= 200; step += 1) {
      trail.push({ x: 0, y: 0, z: step / 10 });
    }

    const distances = Array.from({ length: 100 }, (_, index) => (index + 1) * 0.1);
    const body = trail.sampleManyFromNewest(distances);

    expect(body).toHaveLength(100);
    expect(body[0].z).toBeCloseTo(19.9, 6);
    expect(body[99].z).toBeCloseTo(10, 6);
  });

  it('batch sampling matches individual arc-length samples', () => {
    const trail = new TrailBuffer({ x: 0, y: 0, z: 0 });
    trail.push({ x: 2, y: 0, z: 0 });
    trail.push({ x: 2, y: 3, z: 0 });
    trail.push({ x: 2, y: 3, z: 4 });
    const distances = [0, 0.5, 2, 4.5, 7, 20];

    const individual = distances.map((distance) => trail.sampleFromNewest(distance));
    expect(trail.sampleManyFromNewest(distances)).toEqual(individual);
  });

  it('trims ancient history while preserving interpolation at the retained tail distance', () => {
    const trail = new TrailBuffer({ x: 0, y: 0, z: 0 });
    for (let step = 1; step <= 1000; step += 1) {
      trail.push({ x: 0, y: 0, z: step / 10 });
    }

    trail.trimToDistance(5);

    expect(trail.length).toBeLessThanOrEqual(53);
    expect(trail.sampleFromNewest(5).z).toBeCloseTo(95, 5);
    expect(trail.newest.z).toBeCloseTo(100, 5);
  });
});
