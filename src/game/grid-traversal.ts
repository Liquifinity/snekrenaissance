import { GRID_CONFIG, type GridConfig } from './grid-config';
import type { GridPoint } from './flight';
import type { GridCell } from './grid-types';

export type GridCellEntry = Readonly<{
  cell: GridCell;
  tEnter: number;
}>;

const TIE_EPSILON = 1e-10;

function requireFinitePoint(point: GridPoint, label: string): void {
  for (const axis of ['x', 'y', 'z'] as const) {
    if (!Number.isFinite(point[axis])) {
      throw new RangeError(`${label}.${axis} must be finite.`);
    }
  }
}

function modulo(value: number, resolution: number): number {
  return ((value % resolution) + resolution) % resolution;
}

function canonicalCell(x: number, y: number, z: number, resolution: number): GridCell {
  return Object.freeze({
    x: modulo(x, resolution),
    y: modulo(y, resolution),
    z: modulo(z, resolution)
  });
}

function cellKey(cell: GridCell): string {
  return `${cell.x},${cell.y},${cell.z}`;
}

function axisTraversal(start: number, delta: number): Readonly<{
  step: -1 | 0 | 1;
  tMax: number;
  tDelta: number;
}> {
  if (delta === 0) {
    return { step: 0, tMax: Number.POSITIVE_INFINITY, tDelta: Number.POSITIVE_INFINITY };
  }

  if (delta > 0) {
    const nextBoundary = Math.floor(start) + 1;
    return {
      step: 1,
      tMax: (nextBoundary - start) / delta,
      tDelta: 1 / delta
    };
  }

  const nextBoundary = Math.floor(start);
  return {
    step: -1,
    tMax: (nextBoundary - start) / delta,
    tDelta: -1 / delta
  };
}

export function traverseGridSegment(
  fromUnwrapped: GridPoint,
  toUnwrapped: GridPoint,
  config: GridConfig = GRID_CONFIG
): readonly GridCellEntry[] {
  requireFinitePoint(fromUnwrapped, 'fromUnwrapped');
  requireFinitePoint(toUnwrapped, 'toUnwrapped');

  const delta = {
    x: toUnwrapped.x - fromUnwrapped.x,
    y: toUnwrapped.y - fromUnwrapped.y,
    z: toUnwrapped.z - fromUnwrapped.z
  };

  if (delta.x === 0 && delta.y === 0 && delta.z === 0) return Object.freeze([]);

  let voxelX = Math.floor(fromUnwrapped.x);
  let voxelY = Math.floor(fromUnwrapped.y);
  let voxelZ = Math.floor(fromUnwrapped.z);

  const xAxis = axisTraversal(fromUnwrapped.x, delta.x);
  const yAxis = axisTraversal(fromUnwrapped.y, delta.y);
  const zAxis = axisTraversal(fromUnwrapped.z, delta.z);

  let tMaxX = xAxis.tMax;
  let tMaxY = yAxis.tMax;
  let tMaxZ = zAxis.tMax;

  const entries: GridCellEntry[] = [];
  const seenCanonical = new Set<string>();
  const maxEvents = Math.ceil(Math.abs(delta.x))
    + Math.ceil(Math.abs(delta.y))
    + Math.ceil(Math.abs(delta.z))
    + 6;

  for (let eventIndex = 0; eventIndex < maxEvents; eventIndex += 1) {
    const nextT = Math.min(tMaxX, tMaxY, tMaxZ);
    if (!Number.isFinite(nextT) || nextT > 1 + TIE_EPSILON) break;

    const crossX = Math.abs(tMaxX - nextT) <= TIE_EPSILON;
    const crossY = Math.abs(tMaxY - nextT) <= TIE_EPSILON;
    const crossZ = Math.abs(tMaxZ - nextT) <= TIE_EPSILON;

    if (crossX) {
      voxelX += xAxis.step;
      tMaxX += xAxis.tDelta;
    }
    if (crossY) {
      voxelY += yAxis.step;
      tMaxY += yAxis.tDelta;
    }
    if (crossZ) {
      voxelZ += zAxis.step;
      tMaxZ += zAxis.tDelta;
    }

    const cell = canonicalCell(voxelX, voxelY, voxelZ, config.resolution);
    const key = cellKey(cell);
    if (!seenCanonical.has(key)) {
      seenCanonical.add(key);
      entries.push(Object.freeze({
        cell,
        tEnter: Math.min(1, Math.max(0, nextT))
      }));
    }
  }

  return Object.freeze(entries);
}
