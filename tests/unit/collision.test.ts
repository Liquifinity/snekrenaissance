import { describe, expect, it } from 'vitest';
import { wouldSelfCollide } from '../../src/game/collision';
import { advanceGridStep } from '../../src/game/grid-topology';
import type { GridCell, GridDirection } from '../../src/game/grid-types';
import type { GridSnakeState } from '../../src/game/snake';

function state(cells: GridCell[], pendingGrowth = 0): GridSnakeState {
  return {
    segments: cells.map((cell, id) => ({ id, cell })),
    pendingGrowth,
    nextSegmentId: cells.length
  };
}

describe('exact voxel self collision', () => {
  it('collides with an occupied non-tail cell', () => {
    const snake = state([
      { x: 4, y: 4, z: 4 },
      { x: 4, y: 4, z: 3 },
      { x: 4, y: 3, z: 3 },
      { x: 4, y: 2, z: 3 }
    ]);
    expect(wouldSelfCollide(snake, { x: 4, y: 3, z: 3 })).toBe(true);
  });

  it('does not collide with a free cell', () => {
    const snake = state([
      { x: 4, y: 4, z: 4 },
      { x: 4, y: 4, z: 3 },
      { x: 4, y: 4, z: 2 }
    ]);
    expect(wouldSelfCollide(snake, { x: 5, y: 4, z: 4 })).toBe(false);
  });

  it('allows entry into the current tail only when it vacates this step', () => {
    const cells = [
      { x: 4, y: 4, z: 4 },
      { x: 4, y: 4, z: 3 },
      { x: 4, y: 4, z: 2 }
    ];
    expect(wouldSelfCollide(state(cells, 0), { x: 4, y: 4, z: 2 })).toBe(false);
    expect(wouldSelfCollide(state(cells, 1), { x: 4, y: 4, z: 2 })).toBe(true);
  });

  it.each([
    ['+X', { x: 8, y: 4, z: 4 }, { x: 0, y: 4, z: 4 }],
    ['-X', { x: 0, y: 4, z: 4 }, { x: 8, y: 4, z: 4 }],
    ['+Y', { x: 4, y: 8, z: 4 }, { x: 4, y: 0, z: 4 }],
    ['-Y', { x: 4, y: 0, z: 4 }, { x: 4, y: 8, z: 4 }],
    ['+Z', { x: 4, y: 4, z: 8 }, { x: 4, y: 4, z: 0 }],
    ['-Z', { x: 4, y: 4, z: 0 }, { x: 4, y: 4, z: 8 }]
  ] as const)('detects collision after %s toroidal wrap', (direction, head, wrappedTarget) => {
    const step = advanceGridStep(head, direction as GridDirection);
    expect(step.to).toEqual(wrappedTarget);
    const snake = state([
      head,
      { x: 3, y: 3, z: 3 },
      wrappedTarget,
      { x: 2, y: 2, z: 2 }
    ]);
    expect(wouldSelfCollide(snake, step.to)).toBe(true);
  });
});
