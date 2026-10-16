import { describe, expect, it } from 'vitest';
import { createGridConfig } from '../../src/game/grid-config';
import {
  isGridFoodCollected,
  listFreeCells,
  spawnGridFood
} from '../../src/game/food';
import type { GridCell } from '../../src/game/grid-types';
import type { GridSnakeState } from '../../src/game/snake';

const SMALL_CONFIG = createGridConfig({
  resolution: 2,
  cellSize: 1,
  stepsPerSecond: 6,
  initialLength: 1,
  growthPerFood: 2
});

function state(cells: GridCell[]): GridSnakeState {
  return {
    segments: cells.map((cell, id) => ({ id, cell })),
    pendingGrowth: 0,
    nextSegmentId: cells.length
  };
}

const ALL_2_CELLS: GridCell[] = [
  { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 },
  { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 },
  { x: 0, y: 1, z: 1 }, { x: 1, y: 1, z: 1 }
];

describe('grid food spawning', () => {
  it('enumerates only free cells in deterministic grid order', () => {
    const free = listFreeCells(state([{ x: 0, y: 0, z: 0 }]), SMALL_CONFIG);
    expect(free).toHaveLength(7);
    expect(free).not.toContainEqual({ x: 0, y: 0, z: 0 });
    expect(free[0]).toEqual({ x: 1, y: 0, z: 0 });
  });

  it('selects deterministically from the free-cell list', () => {
    const snake = state([{ x: 0, y: 0, z: 0 }]);
    expect(spawnGridFood(snake, () => 0, SMALL_CONFIG)).toEqual({
      ok: true,
      cell: { x: 1, y: 0, z: 0 }
    });
    expect(spawnGridFood(snake, () => 0.999999, SMALL_CONFIG)).toEqual({
      ok: true,
      cell: { x: 1, y: 1, z: 1 }
    });
  });

  it('returns the last free cell when seven of eight cells are occupied', () => {
    const last = { x: 1, y: 1, z: 1 };
    const occupied = ALL_2_CELLS.filter((cell) =>
      cell.x !== last.x || cell.y !== last.y || cell.z !== last.z
    );
    expect(spawnGridFood(state(occupied), () => 0.5, SMALL_CONFIG)).toEqual({ ok: true, cell: last });
  });

  it('returns a bounded no-free-cell failure for a full world', () => {
    expect(spawnGridFood(state(ALL_2_CELLS), () => 0.5, SMALL_CONFIG)).toEqual({
      ok: false,
      reason: 'no-free-cell'
    });
  });

  it('rejects non-finite RNG values', () => {
    expect(() => spawnGridFood(state([{ x: 0, y: 0, z: 0 }]), () => Number.NaN, SMALL_CONFIG))
      .toThrow('RNG');
  });
});

describe('grid food collection', () => {
  it('collects only by exact cell equality', () => {
    expect(isGridFoodCollected({ x: 4, y: 4, z: 4 }, { x: 4, y: 4, z: 4 })).toBe(true);
    expect(isGridFoodCollected({ x: 4, y: 4, z: 4 }, { x: 5, y: 4, z: 4 })).toBe(false);
  });
});
