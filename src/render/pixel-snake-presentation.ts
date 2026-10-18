import { Matrix4, Quaternion, Vector3 } from 'three';
import { cellToWorld, directionVector } from '../game/grid-topology';
import type { GridDirection, GridFrame } from '../game/grid-types';
import type { RunState } from '../game/run-state';
import type { VoxelSnakeRenderSnapshot } from './snake-renderer';

function vectorFor(direction: GridDirection): Vector3 {
  const vector = directionVector(direction);
  return new Vector3(vector.x, vector.y, vector.z);
}

export function quaternionForGridFrame(
  frame: GridFrame
): Readonly<{ x: number; y: number; z: number; w: number }> {
  if (frame.forward === '+Z' && frame.right === '-X' && frame.up === '+Y') {
    return Object.freeze({ x: 0, y: 0, z: 0, w: 1 });
  }

  const localXWorld = vectorFor(frame.right).multiplyScalar(-1);
  const localYWorld = vectorFor(frame.up);
  const localZWorld = vectorFor(frame.forward);
  const quaternion = new Quaternion()
    .setFromRotationMatrix(new Matrix4().makeBasis(localXWorld, localYWorld, localZWorld))
    .normalize();

  return Object.freeze({
    x: quaternion.x,
    y: quaternion.y,
    z: quaternion.z,
    w: quaternion.w
  });
}

export function buildPixelSnakeRenderSnapshot(
  run: Pick<RunState, 'snake' | 'frame' | 'config'>
): VoxelSnakeRenderSnapshot {
  const [head, ...body] = run.snake.segments;
  if (!head) throw new RangeError('Grid snake has no head segment');

  return Object.freeze({
    headPosition: Object.freeze(cellToWorld(head.cell, run.config)),
    headQuaternion: quaternionForGridFrame(run.frame),
    body: Object.freeze(body.map((segment) => Object.freeze({
      id: segment.id,
      position: Object.freeze(cellToWorld(segment.cell, run.config))
    })))
  });
}
