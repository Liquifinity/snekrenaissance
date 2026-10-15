import {
  SELF_COLLISION_EXCLUSION_SEGMENTS,
  SELF_COLLISION_RADIUS,
  WORLD_SIZE
} from './constants';
import { toroidalDistanceSq } from './torus';
import type { Vec3 } from './types';

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
