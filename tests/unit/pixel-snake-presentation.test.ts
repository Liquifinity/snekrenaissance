import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { cellToWorld } from '../../src/game/grid-topology';
import type { GridDirection } from '../../src/game/grid-types';
import { createRun } from '../../src/game/run-state';
import {
  buildPixelSnakeRenderSnapshot,
  quaternionForGridDirection
} from '../../src/render/pixel-snake-presentation';

const stableRng = () => 0.75;

function rotatedForward(direction: GridDirection): Vector3 {
  const value = quaternionForGridDirection(direction);
  const quaternion = new Quaternion(value.x, value.y, value.z, value.w);
  return new Vector3(0, 0, 1).applyQuaternion(quaternion);
}

describe('V2.2 pixel snake presentation', () => {
  it('derives head and body positions exactly from strategic GridCell centers', () => {
    const run = createRun(stableRng);
    const snapshot = buildPixelSnakeRenderSnapshot(run);
    const [head, ...body] = run.snake.segments;

    expect(snapshot.headPosition).toEqual(cellToWorld(head.cell, run.config));
    expect(snapshot.body).toHaveLength(body.length);
    for (let index = 0; index < body.length; index += 1) {
      expect(snapshot.body[index].id).toBe(body[index].id);
      expect(snapshot.body[index].position).toEqual(cellToWorld(body[index].cell, run.config));
    }
  });

  it('cannot change when only continuous FlightPose state changes inside the same cells', () => {
    const run = createRun(stableRng);
    const before = buildPixelSnakeRenderSnapshot(run);

    run.flight = {
      unwrappedPosition: { x: 4.91, y: 4.13, z: 4.72 },
      wrappedPosition: { x: 4.91, y: 4.13, z: 4.72 },
      orientation: { yaw: 1.2, pitch: -0.4, roll: 0 },
      forward: { x: 0.85, y: -0.38, z: 0.36 }
    };

    const after = buildPixelSnakeRenderSnapshot(run);
    expect(after).toEqual(before);
  });

  it.each([
    ['+X', [1, 0, 0]],
    ['-X', [-1, 0, 0]],
    ['+Y', [0, 1, 0]],
    ['-Y', [0, -1, 0]],
    ['+Z', [0, 0, 1]],
    ['-Z', [0, 0, -1]]
  ] as const)('rotates local +Z to %s', (direction, expected) => {
    const forward = rotatedForward(direction);
    expect(forward.x).toBeCloseTo(expected[0], 10);
    expect(forward.y).toBeCloseTo(expected[1], 10);
    expect(forward.z).toBeCloseTo(expected[2], 10);
  });

  it('uses exact identity quaternion for initial +Z direction', () => {
    expect(quaternionForGridDirection('+Z')).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });
});
