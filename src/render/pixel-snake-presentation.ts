import { Matrix4, Quaternion, Vector3 } from 'three';
import { cellToWorld, directionVector } from '../game/grid-topology';
import type { GridDirection } from '../game/grid-types';
import type { RunState } from '../game/run-state';
import type { VoxelSnakeRenderSnapshot } from './snake-renderer';

function vectorFor(direction: GridDirection): Vector3 {
  const vector = directionVector(direction);
  return new Vector3(vector.x, vector.y, vector.z);
}

export function canonicalVisualUp(heading: GridDirection): GridDirection {
  if (heading === '+Y') return '-Z';
  if (heading === '-Y') return '+Z';
  return '+Y';
}

export function quaternionForHeading(
  heading: GridDirection
): Readonly<{ x: number; y: number; z: number; w: number }> {
  if (heading === '+Z') {
    return Object.freeze({ x: 0, y: 0, z: 0, w: 1 });
  }

  const forward = vectorFor(heading);
  const up = vectorFor(canonicalVisualUp(heading));
  const right = new Vector3().crossVectors(forward, up);
  const localXWorld = right.clone().multiplyScalar(-1);
  const quaternion = new Quaternion()
    .setFromRotationMatrix(new Matrix4().makeBasis(localXWorld, up, forward))
    .normalize();

  return Object.freeze({
    x: quaternion.x,
    y: quaternion.y,
    z: quaternion.z,
    w: quaternion.w
  });
}

export function buildPixelSnakeRenderSnapshot(
  run: Pick<RunState, 'snake' | 'heading' | 'config'>
): VoxelSnakeRenderSnapshot {
  const [head, ...body] = run.snake.segments;
  if (!head) throw new RangeError('Grid snake has no head segment');

  return Object.freeze({
    headPosition: Object.freeze(cellToWorld(head.cell, run.config)),
    headQuaternion: quaternionForHeading(run.heading),
    body: Object.freeze(body.map((segment) => Object.freeze({
      id: segment.id,
      position: Object.freeze(cellToWorld(segment.cell, run.config))
    })))
  });
}
