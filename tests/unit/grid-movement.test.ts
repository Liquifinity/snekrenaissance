import { describe, expect, it } from 'vitest';
import { INITIAL_GRID_FRAME } from '../../src/game/grid-frame';
import * as movement from '../../src/game/grid-movement';
import { advanceGridMovement } from '../../src/game/grid-movement';
import type { GridDirection, GridFrame } from '../../src/game/grid-types';

const FRAMES: Readonly<Record<GridDirection, GridFrame>> = Object.freeze({
  '+X': { forward: '+X', right: '+Z', up: '+Y' },
  '-X': { forward: '-X', right: '-Z', up: '+Y' },
  '+Y': { forward: '+Y', right: '-X', up: '-Z' },
  '-Y': { forward: '-Y', right: '-X', up: '+Z' },
  '+Z': INITIAL_GRID_FRAME,
  '-Z': { forward: '-Z', right: '+X', up: '+Y' }
});

const CENTER = { x: 4, y: 4, z: 4 } as const;

describe('discrete grid movement', () => {
  it('moves forward from the center by exactly one cell', () => {
    const result = advanceGridMovement(CENTER, INITIAL_GRID_FRAME, 'none');
    expect(result.cell).toEqual({ x: 4, y: 4, z: 5 });
    expect(result.frame).toEqual(INITIAL_GRID_FRAME);
    expect(result.cell).toEqual(result.step.to);
  });

  it('applies one local left turn before committing the next cell', () => {
    const result = advanceGridMovement(CENTER, INITIAL_GRID_FRAME, 'left');
    expect(result.cell).toEqual({ x: 5, y: 4, z: 4 });
    expect(result.frame.forward).toBe('+X');
  });

  it.each([
    ['+X', { x: 5, y: 4, z: 4 }],
    ['-X', { x: 3, y: 4, z: 4 }],
    ['+Y', { x: 4, y: 5, z: 4 }],
    ['-Y', { x: 4, y: 3, z: 4 }],
    ['+Z', { x: 4, y: 4, z: 5 }],
    ['-Z', { x: 4, y: 4, z: 3 }]
  ] as const)('moves one face-adjacent cell for %s', (direction, expected) => {
    const result = advanceGridMovement(CENTER, FRAMES[direction], 'none');
    expect(result.cell).toEqual(expected);
    expect(result.step.to).toEqual(expected);

    const changedAxes = [
      result.cell.x !== CENTER.x,
      result.cell.y !== CENTER.y,
      result.cell.z !== CENTER.z
    ].filter(Boolean).length;
    expect(changedAxes).toBe(1);
  });

  it.each([
    ['+X', { x: 8, y: 4, z: 4 }, { x: 0, y: 4, z: 4 }, 'x', 1],
    ['-X', { x: 0, y: 4, z: 4 }, { x: 8, y: 4, z: 4 }, 'x', -1],
    ['+Y', { x: 4, y: 8, z: 4 }, { x: 4, y: 0, z: 4 }, 'y', 1],
    ['-Y', { x: 4, y: 0, z: 4 }, { x: 4, y: 8, z: 4 }, 'y', -1],
    ['+Z', { x: 4, y: 4, z: 8 }, { x: 4, y: 4, z: 0 }, 'z', 1],
    ['-Z', { x: 4, y: 4, z: 0 }, { x: 4, y: 4, z: 8 }, 'z', -1]
  ] as const)('wraps %s through exactly one axis', (direction, start, expected, axis, sign) => {
    const result = advanceGridMovement(start, FRAMES[direction], 'none');
    expect(result.cell).toEqual(expected);
    expect(result.step.wrappedAxis).toBe(axis);
    expect(result.step.wrapSign).toBe(sign);
    expect(result.cell).toEqual(result.step.to);
  });

  it('never produces a logical diagonal transition for any relative turn', () => {
    for (const intent of ['none', 'left', 'right', 'up', 'down'] as const) {
      const result = advanceGridMovement(CENTER, INITIAL_GRID_FRAME, intent);
      const changedAxes = [
        result.cell.x !== CENTER.x,
        result.cell.y !== CENTER.y,
        result.cell.z !== CENTER.z
      ].filter(Boolean).length;
      expect(changedAxes).toBe(1);
    }
  });

  it('exposes only the deterministic movement primitive, not queue or movement-clock authority', () => {
    expect(movement).not.toHaveProperty('TurnIntentQueue');
    expect(movement).not.toHaveProperty('TURN_QUEUE_CAPACITY');
    expect(movement).not.toHaveProperty('GridMovementClock');
  });
});
