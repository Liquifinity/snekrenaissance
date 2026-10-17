import { GRID_CONFIG, type GridConfig } from './grid-config';
import { cellKey, cellsEqual } from './grid-topology';
import type { GridCell } from './grid-types';
import { occupiedCellKeys, type GridSnakeState } from './snake';

export type FoodSpawnResult =
  | { ok: true; cell: GridCell }
  | { ok: false; reason: 'no-free-cell' };

function unitGridRandom(rng: () => number): number {
  const value = rng();
  if (!Number.isFinite(value)) {
    throw new RangeError('Food RNG must return a finite number.');
  }
  return Math.min(1 - Number.EPSILON, Math.max(0, value));
}

export function listFreeCells(
  state: GridSnakeState,
  config: GridConfig = GRID_CONFIG
): GridCell[] {
  const occupied = occupiedCellKeys(state, config);
  const free: GridCell[] = [];

  for (let z = 0; z < config.resolution; z += 1) {
    for (let y = 0; y < config.resolution; y += 1) {
      for (let x = 0; x < config.resolution; x += 1) {
        const cell = { x, y, z };
        if (!occupied.has(cellKey(cell, config))) free.push(cell);
      }
    }
  }

  return free;
}

export function spawnGridFood(
  state: GridSnakeState,
  rng: () => number = Math.random,
  config: GridConfig = GRID_CONFIG
): FoodSpawnResult {
  const free = listFreeCells(state, config);
  if (free.length === 0) return { ok: false, reason: 'no-free-cell' };

  const index = Math.floor(unitGridRandom(rng) * free.length);
  return { ok: true, cell: free[index] };
}

export function isGridFoodCollected(head: GridCell, food: GridCell): boolean {
  return cellsEqual(head, food);
}
