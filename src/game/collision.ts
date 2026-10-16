import {
  SELF_COLLISION_EXCLUSION_SEGMENTS,
  SELF_COLLISION_RADIUS,
  WORLD_SIZE
} from './constants';
import { GRID_CONFIG, type GridConfig } from './grid-config';
import { cellKey } from './grid-topology';
import type { GridCell } from './grid-types';
import type { GridSnakeState } from './snake';
import { toroidalDistanceSq } from './torus';
import type { Vec3 } from './types';

export function wouldSelfCollide(
  state: GridSnakeState,
  nextHead: GridCell,
  config: GridConfig = GRID_CONFIG
): boolean {
  const targetKey = cellKey(nextHead, config);
  const tailIndex = state.segments.length - 1;

  for (let index = 0; index < state.segments.length; index += 1) {
    const segment = state.segments[index];
    if (cellKey(segment.cell, config) !== targetKey) continue;

    const isVacatingTail = index === tailIndex && state.pendingGrowth === 0;
    if (isVacatingTail) continue;
    return true;
  }

  return false;
}

// V1 compatibility surface. Removed when continuous RunState migrates in Task 5.
export function isSelfCollision(
  head: Vec3,
  body: readonly Vec3[],
  worldSize = WORLD_SIZE,
  exclusionSegments = SELF_COLLISION_EXCLUSION_SEGMENTS,
  collisionRadius = SELF_COLLISION_RADIUS
): boolean {
  if (!Number.isInteger(exclusionSegments) || exclusionSegments < 0) {
    throw new RangeError('Self-collision exclusion must be a non-negative integer.');
  }
  if (!Number.isFinite(collisionRadius) || collisionRadius < 0) {
    throw new RangeError('Self-collision radius must be a finite non-negative number.');
  }

  const collisionRadiusSq = collisionRadius * collisionRadius;

  for (let index = exclusionSegments; index < body.length; index += 1) {
    if (toroidalDistanceSq(head, body[index], worldSize) <= collisionRadiusSq) {
      return true;
    }
  }

  return false;
}
