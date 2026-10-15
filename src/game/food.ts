import {
  FOOD_BODY_CLEARANCE,
  FOOD_HEAD_EXCLUSION_RADIUS,
  FOOD_PICKUP_RADIUS,
  FOOD_SPAWN_MAX_ATTEMPTS,
  WORLD_SIZE
} from './constants';
import { toroidalDistanceSq } from './torus';
import type { Vec3 } from './types';

export type FoodSpawnSuccess = { ok: true; position: Vec3 };
export type FoodSpawnFailure = { ok: false; reason: 'no-valid-position' };
export type FoodSpawnResult = FoodSpawnSuccess | FoodSpawnFailure;

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
}: SpawnFoodOptions): FoodSpawnResult {
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
