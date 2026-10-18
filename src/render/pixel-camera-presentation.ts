import type { GridPoint } from '../game/flight';
import { cellToWorld } from '../game/grid-topology';
import type { GridCell } from '../game/grid-types';
import type { RunState } from '../game/run-state';
import type { ChaseCameraSnapshot } from './chase-camera';
import {
  unwrappedWorldForGridPoint,
  type FlightPresentation
} from './flight-presentation';

export function unwrapCellCenterNear(
  cell: GridCell,
  anchor: GridPoint,
  resolution: number
): GridPoint {
  if (!Number.isInteger(resolution) || resolution < 2) {
    throw new RangeError('Camera grid resolution must be an integer >= 2.');
  }

  const point = {
    x: cell.x + 0.5,
    y: cell.y + 0.5,
    z: cell.z + 0.5
  };

  for (const axis of ['x', 'y', 'z'] as const) {
    point[axis] += Math.round((anchor[axis] - point[axis]) / resolution) * resolution;
  }

  return Object.freeze(point);
}

export function buildPixelChaseCameraSnapshot(
  run: Pick<RunState, 'snake' | 'config'>,
  navigation: FlightPresentation
): ChaseCameraSnapshot {
  const head = run.snake.segments[0];
  if (!head) throw new RangeError('Grid snake has no head segment');

  const unwrappedCenter = unwrapCellCenterNear(
    head.cell,
    navigation.unwrappedGridPoint,
    run.config.resolution
  );
  const headWorld = unwrappedWorldForGridPoint(unwrappedCenter, run.config);
  const displayedHeadWorld = cellToWorld(head.cell, run.config);
  const displayWrapOffset = Object.freeze({
    x: displayedHeadWorld.x - headWorld.x,
    y: displayedHeadWorld.y - headWorld.y,
    z: displayedHeadWorld.z - headWorld.z
  });

  return Object.freeze({
    headWorld,
    displayWrapOffset,
    forwardWorld: navigation.forwardWorld,
    upWorld: navigation.upWorld
  });
}
