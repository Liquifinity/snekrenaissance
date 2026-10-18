import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { cellToWorld, directionVector } from '../../src/game/grid-topology';
import type { GridDirection } from '../../src/game/grid-types';
import { createRun } from '../../src/game/run-state';
import * as presentation from '../../src/render/pixel-snake-presentation';

const stableRng = () => 0.75;
const DIRECTIONS: readonly GridDirection[] = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];
const EXPECTED_UP: Readonly<Record<GridDirection, GridDirection>> = {
  '+X': '+Y', '-X': '+Y', '+Y': '-Z', '-Y': '+Z', '+Z': '+Y', '-Z': '+Y'
};

type QuaternionValue = Readonly<{ x: number; y: number; z: number; w: number }>;
type QuaternionForHeading = (heading: GridDirection) => QuaternionValue;

function quaternionForHeading(): QuaternionForHeading | undefined {
  return (presentation as unknown as { quaternionForHeading?: QuaternionForHeading }).quaternionForHeading;
}

function vector(direction: GridDirection): Vector3 {
  const value = directionVector(direction);
  return new Vector3(value.x, value.y, value.z);
}

function expectVector(actual: Vector3, expected: Vector3): void {
  expect(actual.x).toBeCloseTo(expected.x, 10);
  expect(actual.y).toBeCloseTo(expected.y, 10);
  expect(actual.z).toBeCloseTo(expected.z, 10);
}

describe('SNEK CORE V4 pixel snake presentation', () => {
  it('derives head and body positions exactly from strategic GridCell centers with stable ids', () => {
    const run = createRun(stableRng);
    const snapshot = presentation.buildPixelSnakeRenderSnapshot(run as never);
    const [head, ...body] = run.snake.segments;
    expect(snapshot.headPosition).toEqual(cellToWorld(head.cell, run.config));
    expect(snapshot.body).toHaveLength(body.length);
    body.forEach((segment, index) => {
      expect(snapshot.body[index].id).toBe(segment.id);
      expect(snapshot.body[index].position).toEqual(cellToWorld(segment.cell, run.config));
    });
  });

  it.each(DIRECTIONS)('orients local forward and canonical visual up for %s', (heading) => {
    const makeQuaternion = quaternionForHeading();
    expect(typeof makeQuaternion).toBe('function');
    if (!makeQuaternion) return;
    const value = makeQuaternion(heading);
    const q = new Quaternion(value.x, value.y, value.z, value.w);
    expectVector(new Vector3(0, 0, 1).applyQuaternion(q), vector(heading));
    expectVector(new Vector3(0, 1, 0).applyQuaternion(q), vector(EXPECTED_UP[heading]));
    expect(q.length()).toBeCloseTo(1, 10);
  });

  it('keeps the approved initial +Z orientation as identity', () => {
    const makeQuaternion = quaternionForHeading();
    expect(typeof makeQuaternion).toBe('function');
    if (!makeQuaternion) return;
    expect(makeQuaternion('+Z')).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });
});
