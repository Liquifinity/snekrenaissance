import { Quaternion, Vector3 } from 'three';
import { cellToWorld } from '../game/grid-topology';
import type { GridDirection } from '../game/grid-types';
import type { RunState } from '../game/run-state';
import type { VoxelSnakeRenderSnapshot } from './snake-renderer';

const LOCAL_FORWARD = new Vector3(0, 0, 1);
const DIRECTION_VECTORS: Readonly<Record<GridDirection, readonly [number, number, number]>> = Object.freeze({
  '+X': [1, 0, 0],
  '-X': [-1, 0, 0],
  '+Y': [0, 1, 0],
  '-Y': [0, -1, 0],
  '+Z': [0, 0, 1],
  '-Z': [0, 0, -1]
});

export function quaternionForGridDirection(
  direction: GridDirection
): Readonly<{ x: number; y: number; z: number; w: number }> {
  if (direction === '+Z') {
    return Object.freeze({ x: 0, y: 0, z: 0, w: 1 });
  }

  const [x, y, z] = DIRECTION_VECTORS[direction];
  const quaternion = new Quaternion()
    .setFromUnitVectors(LOCAL_FORWARD, new Vector3(x, y, z))
    .normalize();

  return Object.freeze({
    x: quaternion.x,
    y: quaternion.y,
    z: quaternion.z,
    w: quaternion.w
  });
}

export function buildPixelSnakeRenderSnapshot(
  run: Pick<RunState, 'snake' | 'visibleDirection' | 'config'>
): VoxelSnakeRenderSnapshot {
  const [head, ...body] = run.snake.segments;
  if (!head) throw new RangeError('Grid snake has no head segment');

  return Object.freeze({
    headPosition: Object.freeze(cellToWorld(head.cell, run.config)),
    headQuaternion: quaternionForGridDirection(run.visibleDirection),
    body: Object.freeze(body.map((segment) => Object.freeze({
      id: segment.id,
      position: Object.freeze(cellToWorld(segment.cell, run.config))
    })))
  });
}
