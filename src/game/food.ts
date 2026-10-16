import {
  FOOD_BODY_CLEARANCE,
  FOOD_HEAD_EXCLUSION_RADIUS,
  FOOD_PICKUP_RADIUS,
  FOOD_SPAWN_MAX_ATTEMPTS,
  WORLD_SIZE
} from './constants';
import { GRID_CONFIG, type GridConfig } from './grid-config';
import { cellKey, cellsEqual } from './grid-topology';
import type { GridCell } from './grid-types';
import { occupiedCellKeys, type GridSnakeState } from './snake';
import { toroidalDistanceSq } from './torus';
import type { Vec3 } from './types';

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

// V1 compatibility surface. Removed when continuous RunState migrates in Task 5.
export type LegacyFoodSpawnSuccess = { ok: true; position: Vec3 };
export type LegacyFoodSpawnFailure = { ok: false; reason: 'no-valid-position' };
export type LegacyFoodSpawnResult = LegacyFoodSpawnSuccess | LegacyFoodSpawnFailure;

export type SpawnFoodOptions = {
  head: Vec3;
  body: readonly Vec3[];
  rng?: () => number;
  worldSize?: number;
  headExclusionRadius?: number;
  bodyClearance?: number;
  maxAttempts?: number;
};

function unitRandom(rng: () => number): number {
  const value = rng();
  if (!Number.isFinite(value)) {
    throw new RangeError('Food RNG must return a finite number.');
  }
  return Math.min(1 - Number.EPSILON, Math.max(0, value));
}

function randomCoordinate(rng: () => number, worldSize: number): number {
  return unitRandom(rng) * worldSize - worldSize / 2;
}

export function spawnFood({
  head,
  body,
  rng = Math.random,
  worldSize = WORLD_SIZE,
  headExclusionRadius = FOOD_HEAD_EXCLUSION_RADIUS,
  bodyClearance = FOOD_BODY_CLEARANCE,
  maxAttempts = FOOD_SPAWN_MAX_ATTEMPTS
}: SpawnFoodOptions): LegacyFoodSpawnResult {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError('Food maxAttempts must be a positive integer.');
  }

  const headRadiusSq = headExclusionRadius * headExclusionRadius;
  const bodyClearanceSq = bodyClearance * bodyClearance;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const position = {
      x: randomCoordinate(rng, worldSize),
      y: randomCoordinate(rng, worldSize),
      z: randomCoordinate(rng, worldSize)
    };

    if (toroidalDistanceSq(position, head, worldSize) < headRadiusSq) {
      continue;
    }

    if (body.some((segment) => toroidalDistanceSq(position, segment, worldSize) < bodyClearanceSq)) {
      continue;
    }

    return { ok: true, position };
  }

  return { ok: false, reason: 'no-valid-position' };
}

export function isFoodCollected(
  head: Vec3,
  food: Vec3,
  worldSize = WORLD_SIZE,
  pickupRadius = FOOD_PICKUP_RADIUS
): boolean {
  return toroidalDistanceSq(head, food, worldSize) <= pickupRadius * pickupRadius;
}
