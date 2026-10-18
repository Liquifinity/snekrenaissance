import type { GridDirection } from './grid-types';
import type { Vec3 } from './types';

function requireFiniteForward(forward: Vec3): void {
  if (!Number.isFinite(forward.x) || !Number.isFinite(forward.y) || !Number.isFinite(forward.z)) {
    throw new RangeError('Forward vector components must be finite.');
  }
}

export function quantizeForwardToGridDirection(forward: Vec3): GridDirection {
  requireFiniteForward(forward);

  const absX = Math.abs(forward.x);
  const absY = Math.abs(forward.y);
  const absZ = Math.abs(forward.z);

  if (absX >= absY && absX >= absZ) {
    return forward.x < 0 ? '-X' : '+X';
  }
  if (absY >= absZ) {
    return forward.y < 0 ? '-Y' : '+Y';
  }
  return forward.z < 0 ? '-Z' : '+Z';
}
