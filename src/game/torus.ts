import type { Vec3 } from './types';

function requireValidSize(size: number): void {
  if (!Number.isFinite(size) || size <= 0) {
    throw new RangeError('Toroidal world size must be a finite positive number.');
  }
}

export function wrapScalar(value: number, size: number): number {
  requireValidSize(size);
  const half = size / 2;
  return ((((value + half) % size) + size) % size) - half;
}

export function wrapVec3(position: Vec3, size: number): Vec3 {
  return {
    x: wrapScalar(position.x, size),
    y: wrapScalar(position.y, size),
    z: wrapScalar(position.z, size)
  };
}

export function shortestWrappedDelta(from: number, to: number, size: number): number {
  return wrapScalar(to - from, size);
}

export function toroidalDistanceSq(a: Vec3, b: Vec3, size: number): number {
  const dx = shortestWrappedDelta(a.x, b.x, size);
  const dy = shortestWrappedDelta(a.y, b.y, size);
  const dz = shortestWrappedDelta(a.z, b.z, size);
  return dx * dx + dy * dy + dz * dz;
}
