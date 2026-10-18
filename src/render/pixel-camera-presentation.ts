import { cellToWorld, directionVector } from '../game/grid-topology';
import type { GridDirection } from '../game/grid-types';
import type { RunState } from '../game/run-state';
import type { Vec3 } from '../game/types';
import type { ChaseCameraSnapshot } from './chase-camera';

function worldVector(direction: GridDirection): Vec3 {
  const vector = directionVector(direction);
  return Object.freeze({ x: vector.x, y: vector.y, z: vector.z });
}

export function buildPixelChaseCameraSnapshot(
  run: Pick<RunState, 'snake' | 'frame' | 'config'>
): ChaseCameraSnapshot {
  const head = run.snake.segments[0];
  if (!head) throw new RangeError('Grid snake has no head segment');

  return Object.freeze({
    headWorld: Object.freeze(cellToWorld(head.cell, run.config)),
    forwardWorld: worldVector(run.frame.forward),
    upWorld: worldVector(run.frame.up)
  });
}
