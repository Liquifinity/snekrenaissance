import { describe, expect, it } from 'vitest';
import { WORLD_SIZE } from '../../src/game/constants';
import { isFoodCollected, spawnFood } from '../../src/game/food';

function sequenceRng(values: number[]): () => number {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

describe('food spawning', () => {
  const half = WORLD_SIZE / 2;
  const quarter = WORLD_SIZE / 4;

  it('spawns inside canonical world bounds', () => {
    const result = spawnFood({
      head: { x: -half, y: -half, z: -half },
      body: [],
      rng: () => 0.5
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.position.x).toBeGreaterThanOrEqual(-half);
    expect(result.position.x).toBeLessThan(half);
    expect(result.position.y).toBeGreaterThanOrEqual(-half);
    expect(result.position.y).toBeLessThan(half);
    expect(result.position.z).toBeGreaterThanOrEqual(-half);
    expect(result.position.z).toBeLessThan(half);
  });

  it('retries when a candidate overlaps the snake body', () => {
    const result = spawnFood({
      head: { x: -half, y: -half, z: -half },
      body: [{ x: 0, y: 0, z: 0 }],
      rng: sequenceRng([0.5, 0.5, 0.5, 0.75, 0.75, 0.75]),
      maxAttempts: 2
    });

    expect(result).toEqual({ ok: true, position: { x: quarter, y: quarter, z: quarter } });
  });

  it('retries when a candidate is too close to the head', () => {
    const result = spawnFood({
      head: { x: 0, y: 0, z: 0 },
      body: [],
      rng: sequenceRng([0.5, 0.5, 0.5, 0.75, 0.75, 0.75]),
      maxAttempts: 2
    });

    expect(result).toEqual({ ok: true, position: { x: quarter, y: quarter, z: quarter } });
  });

  it('returns exactly one food position on success', () => {
    const result = spawnFood({
      head: { x: -half, y: -half, z: -half },
      body: [],
      rng: () => 0.75
    });

    expect(result).toEqual({ ok: true, position: { x: quarter, y: quarter, z: quarter } });
  });

  it('returns an explicit bounded failure instead of looping forever', () => {
    const result = spawnFood({
      head: { x: 0, y: 0, z: 0 },
      body: [{ x: 0, y: 0, z: 0 }],
      rng: () => 0.5,
      maxAttempts: 3
    });

    expect(result).toEqual({ ok: false, reason: 'no-valid-position' });
  });
});

describe('food pickup', () => {
  it('uses toroidal proximity across opposite faces with compact pickup tolerance', () => {
    const half = WORLD_SIZE / 2;
    expect(isFoodCollected(
      { x: half - 0.08, y: 0, z: 0 },
      { x: -half + 0.08, y: 0, z: 0 }
    )).toBe(true);
  });

  it('does not collect spatially distant food', () => {
    expect(isFoodCollected(
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 }
    )).toBe(false);
  });
});
