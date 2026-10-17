import { GRID_CONFIG, type GridConfig } from './grid-config';
import type { GridPoint } from './flight';
import type { GridCell } from './grid-types';

export type GridCellEntry = Readonly<{
  cell: GridCell;
  tEnter: number;
}>;

const TIE_EPSILON = 1e-12;

function requireFinitePoint(point: GridPoint, label: string): void {
  for (const axis of ['x', 'y', 'z'] as const) {
    if (!Number.isFinite(point[axis])) {
      throw new RangeError(`${label}.${axis} must be finite.`);
    }
  }
}

function canonicalAxis(value: number, resolution: number): number {
  return ((value % resolution) + resolution) % resolution;
}

function canonicalCell(x: number, y: number, z: number, resolution: number): GridCell {
  return Object.freeze({
    x: canonicalAxis(x, resolution),
    y: canonicalAxis(y, resolution),
    z: canonicalAxis(z, resolution)
  });
}

function keyOf(cell: GridCell): string {
  return `${cell.x},${cell.y},${cell.z}`;
}

export function traverseGridSegment(
  fromUnwrapped: GridPoint,
  toUnwrapped: GridPoint,
  config: GridConfig = GRID_CONFIG
): readonly GridCellEntry[] {
  requireFinitePoint(fromUnwrapped, 'fromUnwrapped');
  requireFinitePoint(toUnwrapped, 'toUnwrapped');

  const dx = toUnwrapped.x - fromUnwrapped.x;
  const dy = toUnwrapped.y - fromUnwrapped.y;
  const dz = toUnwrapped.z - fromUnwrapped.z;

  if (dx === 0 && dy === 0 && dz === 0) return Object.freeze([]);

  const current = {
    x: Math.floor(fromUnwrapped.x),
    y: Math.floor(fromUnwrapped.y),
    z: Math.floor(fromUnwrapped.z)
  };

  const step = {
    x: Math.sign(dx),
    y: Math.sign(dy),
    z: Math.sign(dz)
  };

  const delta = {
    x: dx === 0 ? Number.POSITIVE_INFINITY : 1 / Math.abs(dx),
    y: dy === 0 ? Number.POSITIVE_INFINITY : 1 / Math.abs(dy),
    z: dz === 0 ? Number.POSITIVE_INFINITY : 1 / Math.abs(dz)
  };

  const initialTMax = (value: number, voxel: number, direction: number, d: number): number => {
    if (d === 0) return Number.POSITIVE_INFINITY;
    if (direction > 0) return ((voxel + 1) - value) / Math.abs(d);
    return (value - voxel) / Math.abs(d);
  };

  const tMax = {
    x: initialTMax(fromUnwrapped.x, current.x, step.x, dx),
    y: initialTMax(fromUnwrapped.y, current.y, step.y, dy),
    z: initialTMax(fromUnwrapped.z, current.z, step.z, dz)
  };

  const entries: GridCellEntry[] = [];
  const emitted = new Set<string>();

  while (true) {
    const tNext = Math.min(tMax.x, tMax.y, tMax.z);
    if (!Number.isFinite(tNext) || tNext > 1 + TIE_EPSILON) break;

    if (Math.abs(tMax.x - tNext) <= TIE_EPSILON) {
      current.x += step.x;
      tMax.x += delta.x;
    }
    if (Math.abs(tMax.y - tNext) <= TIE_EPSILON) {
      current.y += step.y;
      tMax.y += delta.y;
    }
    if (Math.abs(tMax.z - tNext) <= TIE_EPSILON) {
      current.z += step.z;
      tMax.z += delta.z;
    }

    const cell = canonicalCell(current.x, current.y, current.z, config.resolution);
    const key = keyOf(cell);
    if (!emitted.has(key)) {
      emitted.add(key);
      entries.push(Object.freeze({
        cell,
        tEnter: Math.min(1, Math.max(0, tNext))
      }));
    }
  }

  return Object.freeze(entries);
}
