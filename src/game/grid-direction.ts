import type { GridDirection } from './grid-types';
import type { Vec3 } from './types';

const OPPOSITE_GRID_DIRECTION: Readonly<Record<GridDirection, GridDirection>> = Object.freeze({
  '+X': '-X',
  '-X': '+X',
  '+Y': '-Y',
  '-Y': '+Y',
  '+Z': '-Z',
  '-Z': '+Z'
});

function requireFiniteForward(forward: Vec3): void {
  if (!Number.isFinite(forward.x) || !Number.isFinite(forward.y) || !Number.isFinite(forward.z)) {
    throw new RangeError('Forward vector components must be finite.');
  }
}

export function oppositeGridDirection(direction: GridDirection): GridDirection {
  return OPPOSITE_GRID_DIRECTION[direction];
}

export function isOppositeGridDirection(a: GridDirection, b: GridDirection): boolean {
  return oppositeGridDirection(a) === b;
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
