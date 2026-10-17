import { GRID_CONFIG, type GridConfig } from './grid-config';
import type { GridPoint } from './flight';
import type { GridCell } from './grid-types';

export type GridCellEntry = Readonly<{
  cell: GridCell;
  tEnter: number;
}>;

const TIE_EPSILON = 1e-10;
const INTEGER_SNAP_EPSILON = 1e-10;

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

function snapNearInteger(value: number): number {
  const rounded = Math.round(value);
  return Math.abs(value - rounded) <= INTEGER_SNAP_EPSILON ? rounded : value;
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

  const from = {
    x: snapNearInteger(fromUnwrapped.x),
    y: snapNearInteger(fromUnwrapped.y),
    z: snapNearInteger(fromUnwrapped.z)
  };
  const to = {
    x: snapNearInteger(toUnwrapped.x),
    y: snapNearInteger(toUnwrapped.y),
    z: snapNearInteger(toUnwrapped.z)
  };
  const delta = {
    x: to.x - from.x,
    y: to.y - from.y,
    z: to.z - from.z
  };

  if (delta.x === 0 && delta.y === 0 && delta.z === 0) return Object.freeze([]);

  let voxelX = Math.floor(from.x);
  let voxelY = Math.floor(from.y);
  let voxelZ = Math.floor(from.z);
  const targetVoxelX = Math.floor(to.x);
  const targetVoxelY = Math.floor(to.y);
  const targetVoxelZ = Math.floor(to.z);

  if (voxelX === targetVoxelX && voxelY === targetVoxelY && voxelZ === targetVoxelZ) {
    return Object.freeze([]);
  }

  const xAxis = axisTraversal(from.x, delta.x);
  const yAxis = axisTraversal(from.y, delta.y);
  const zAxis = axisTraversal(from.z, delta.z);

  let tMaxX = xAxis.tMax;
  let tMaxY = yAxis.tMax;
  let tMaxZ = zAxis.tMax;

  const entries: GridCellEntry[] = [];
  const seenCanonical = new Set<string>();
  const maxEvents = Math.abs(targetVoxelX - voxelX)
    + Math.abs(targetVoxelY - voxelY)
    + Math.abs(targetVoxelZ - voxelZ)
    + 3;

  for (let eventIndex = 0; eventIndex < maxEvents; eventIndex += 1) {
    if (voxelX === targetVoxelX && voxelY === targetVoxelY && voxelZ === targetVoxelZ) break;

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
