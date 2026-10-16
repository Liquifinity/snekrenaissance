import { GRID_CONFIG, type GridConfig } from './grid-config';
import type { Vec3 } from './types';
import type { AxisVector, GridCell, GridDirection, GridStep } from './grid-types';

const DIRECTION_VECTORS: Readonly<Record<GridDirection, AxisVector>> = Object.freeze({
  '+X': { x: 1, y: 0, z: 0 },
  '-X': { x: -1, y: 0, z: 0 },
  '+Y': { x: 0, y: 1, z: 0 },
  '-Y': { x: 0, y: -1, z: 0 },
  '+Z': { x: 0, y: 0, z: 1 },
  '-Z': { x: 0, y: 0, z: -1 }
});

export function cellKey(cell: GridCell, config: GridConfig = GRID_CONFIG): number {
  const { resolution } = config;
  return cell.x + cell.y * resolution + cell.z * resolution * resolution;
}

export function cellsEqual(a: GridCell, b: GridCell): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

export function directionVector(direction: GridDirection): AxisVector {
  return DIRECTION_VECTORS[direction];
}

export function wrapCellAxis(value: number, resolution: number): number {
  return ((value % resolution) + resolution) % resolution;
}

export function advanceGridStep(
  cell: GridCell,
  direction: GridDirection,
  config: GridConfig = GRID_CONFIG
): GridStep {
  const vector = directionVector(direction);
  const unwrapped = {
    x: cell.x + vector.x,
    y: cell.y + vector.y,
    z: cell.z + vector.z
  };

  let wrappedAxis: GridStep['wrappedAxis'] = null;
  let wrapSign: GridStep['wrapSign'] = 0;

  if (unwrapped.x < 0 || unwrapped.x >= config.resolution) {
    wrappedAxis = 'x';
    wrapSign = vector.x;
  } else if (unwrapped.y < 0 || unwrapped.y >= config.resolution) {
    wrappedAxis = 'y';
    wrapSign = vector.y;
  } else if (unwrapped.z < 0 || unwrapped.z >= config.resolution) {
    wrappedAxis = 'z';
    wrapSign = vector.z;
  }

  return {
    from: cell,
    to: {
      x: wrapCellAxis(unwrapped.x, config.resolution),
      y: wrapCellAxis(unwrapped.y, config.resolution),
      z: wrapCellAxis(unwrapped.z, config.resolution)
    },
    direction,
    wrappedAxis,
    wrapSign
  };
}

export function cellToWorld(cell: GridCell, config: GridConfig = GRID_CONFIG): Vec3 {
  const toAxis = (coordinate: number): number =>
    (coordinate + 0.5) * config.cellSize - config.worldSize / 2;

  return {
    x: toAxis(cell.x),
    y: toAxis(cell.y),
    z: toAxis(cell.z)
  };
}

/** Debug/test/tooling only. Production gameplay must remain GridCell-authoritative. */
export function worldToCell(world: Vec3, config: GridConfig = GRID_CONFIG): GridCell {
  const toCellAxis = (coordinate: number): number =>
    Math.floor((coordinate + config.worldSize / 2) / config.cellSize);

  return {
    x: toCellAxis(world.x),
    y: toCellAxis(world.y),
    z: toCellAxis(world.z)
  };
}
