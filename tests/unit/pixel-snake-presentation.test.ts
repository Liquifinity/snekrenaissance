import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { cellToWorld, directionVector } from '../../src/game/grid-topology';
import type { GridFrame } from '../../src/game/grid-types';
import { createRun } from '../../src/game/run-state';
import {
  buildPixelSnakeRenderSnapshot,
  quaternionForGridFrame
} from '../../src/render/pixel-snake-presentation';

const stableRng = () => 0.75;

function quaternion(frame: GridFrame): Quaternion {
  const value = quaternionForGridFrame(frame);
  return new Quaternion(value.x, value.y, value.z, value.w);
}

function expectedVector(direction: GridFrame['forward']): Vector3 {
  const value = directionVector(direction);
  return new Vector3(value.x, value.y, value.z);
}

function expectVector(actual: Vector3, expected: Vector3): void {
  expect(actual.x).toBeCloseTo(expected.x, 10);
  expect(actual.y).toBeCloseTo(expected.y, 10);
  expect(actual.z).toBeCloseTo(expected.z, 10);
}

describe('SNEK CORE V3 pixel snake presentation', () => {
  it('derives head and body positions exactly from strategic GridCell centers with stable ids', () => {
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

  it('uses exact identity orientation for the approved initial GridFrame', () => {
    const frame: GridFrame = { forward: '+Z', right: '-X', up: '+Y' };
    expect(quaternionForGridFrame(frame)).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });

  it.each([
    [{ forward: '+X', right: '+Z', up: '+Y' }, '+X', '+Y'],
    [{ forward: '-X', right: '-Z', up: '+Y' }, '-X', '+Y'],
    [{ forward: '+Y', right: '+X', up: '+Z' }, '+Y', '+Z'],
    [{ forward: '+Y', right: '-X', up: '-Z' }, '+Y', '-Z'],
    [{ forward: '-Y', right: '-X', up: '+Z' }, '-Y', '+Z'],
    [{ forward: '-Z', right: '+X', up: '+Y' }, '-Z', '+Y']
  ] as const)(
    'maps local forward/up to full cardinal frame %#',
    (frame, forward, up) => {
      const q = quaternion(frame);
      const displayedForward = new Vector3(0, 0, 1).applyQuaternion(q);
      const displayedUp = new Vector3(0, 1, 0).applyQuaternion(q);

      expectVector(displayedForward, expectedVector(forward));
      expectVector(displayedUp, expectedVector(up));
      expect(q.length()).toBeCloseTo(1, 10);
    }
  );

  it('distinguishes vertical frames that share forward but have different local up', () => {
    const upZ: GridFrame = { forward: '+Y', right: '+X', up: '+Z' };
    const downZ: GridFrame = { forward: '+Y', right: '-X', up: '-Z' };

    const a = quaternionForGridFrame(upZ);
    const b = quaternionForGridFrame(downZ);
    expect(a).not.toEqual(b);

    expectVector(
      new Vector3(0, 1, 0).applyQuaternion(new Quaternion(a.x, a.y, a.z, a.w)),
      expectedVector('+Z')
    );
    expectVector(
      new Vector3(0, 1, 0).applyQuaternion(new Quaternion(b.x, b.y, b.z, b.w)),
      expectedVector('-Z')
    );
  });
});
