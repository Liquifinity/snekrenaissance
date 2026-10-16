import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../../src/game/grid-config';
import type { GridCell, GridDirection } from '../../src/game/grid-types';
import {
  advanceGridStep,
  cellKey,
  cellToWorld,
  cellsEqual,
  directionVector,
  worldToCell,
  wrapCellAxis
} from '../../src/game/grid-topology';

describe('grid topology', () => {
  it('assigns a unique key to every baseline cell', () => {
    const keys = new Set<number>();
    for (let z = 0; z < GRID_CONFIG.resolution; z += 1) {
      for (let y = 0; y < GRID_CONFIG.resolution; y += 1) {
        for (let x = 0; x < GRID_CONFIG.resolution; x += 1) {
          keys.add(cellKey({ x, y, z }));
        }
      }
    }
    expect(keys.size).toBe(GRID_CONFIG.totalCells);
  });

  it('wraps integer axes exactly in both directions', () => {
    expect(wrapCellAxis(9, 9)).toBe(0);
    expect(wrapCellAxis(-1, 9)).toBe(8);
    expect(wrapCellAxis(18, 9)).toBe(0);
    expect(wrapCellAxis(-10, 9)).toBe(8);
  });

  it.each<[GridDirection, GridCell]>([
    ['+X', { x: 5, y: 4, z: 4 }],
    ['-X', { x: 3, y: 4, z: 4 }],
    ['+Y', { x: 4, y: 5, z: 4 }],
    ['-Y', { x: 4, y: 3, z: 4 }],
    ['+Z', { x: 4, y: 4, z: 5 }],
    ['-Z', { x: 4, y: 4, z: 3 }]
  ])('advances exactly one face-adjacent cell for %s', (direction, expected) => {
    const step = advanceGridStep({ x: 4, y: 4, z: 4 }, direction);
    expect(step.to).toEqual(expected);
    expect(step.wrappedAxis).toBeNull();
    expect(step.wrapSign).toBe(0);
  });

  it('returns explicit positive and negative wrap metadata', () => {
    expect(advanceGridStep({ x: 8, y: 2, z: 3 }, '+X')).toMatchObject({
      to: { x: 0, y: 2, z: 3 },
      wrappedAxis: 'x',
      wrapSign: 1
    });
    expect(advanceGridStep({ x: 0, y: 2, z: 3 }, '-X')).toMatchObject({
      to: { x: 8, y: 2, z: 3 },
      wrappedAxis: 'x',
      wrapSign: -1
    });
    expect(advanceGridStep({ x: 2, y: 8, z: 3 }, '+Y').wrappedAxis).toBe('y');
    expect(advanceGridStep({ x: 2, y: 3, z: 8 }, '+Z').wrappedAxis).toBe('z');
  });

  it('maps the baseline center cell exactly to world origin', () => {
    expect(cellToWorld({ x: 4, y: 4, z: 4 })).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('maps adjacent cells one CELL_SIZE apart in presentation space', () => {
    const a = cellToWorld({ x: 4, y: 4, z: 4 });
    const b = cellToWorld({ x: 5, y: 4, z: 4 });
    expect(b.x - a.x).toBeCloseTo(GRID_CONFIG.cellSize, 10);
    expect(b.y).toBe(a.y);
    expect(b.z).toBe(a.z);
  });

  it('round-trips cell centers through debug-only worldToCell', () => {
    for (const cell of [
      { x: 0, y: 0, z: 0 },
      { x: 4, y: 4, z: 4 },
      { x: 8, y: 8, z: 8 }
    ]) {
      expect(worldToCell(cellToWorld(cell))).toEqual(cell);
    }
  });

  it('exposes deterministic direction vectors and equality', () => {
    expect(directionVector('+X')).toEqual({ x: 1, y: 0, z: 0 });
    expect(directionVector('-Z')).toEqual({ x: 0, y: 0, z: -1 });
    expect(cellsEqual({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 })).toBe(true);
    expect(cellsEqual({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 4 })).toBe(false);
  });
});
