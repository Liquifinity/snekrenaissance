import { describe, expect, it } from 'vitest';
import { GRID_CONFIG, createGridConfig } from '../../src/game/grid-config';
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

describe('Pixel Flight Grid V2 topology', () => {
  it('encodes every baseline cell with a unique key', () => {
    const keys = new Set<number>();

    for (let z = 0; z < GRID_CONFIG.resolution; z += 1) {
      for (let y = 0; y < GRID_CONFIG.resolution; y += 1) {
        for (let x = 0; x < GRID_CONFIG.resolution; x += 1) {
          keys.add(cellKey({ x, y, z }));
        }
      }
    }

    expect(keys.size).toBe(729);
  });

  it('compares cells by integer coordinates', () => {
    expect(cellsEqual({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 })).toBe(true);
    expect(cellsEqual({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 4 })).toBe(false);
  });

  it.each([
    ['+X', { x: 1, y: 0, z: 0 }],
    ['-X', { x: -1, y: 0, z: 0 }],
    ['+Y', { x: 0, y: 1, z: 0 }],
    ['-Y', { x: 0, y: -1, z: 0 }],
    ['+Z', { x: 0, y: 0, z: 1 }],
    ['-Z', { x: 0, y: 0, z: -1 }]
  ] as const)('maps %s to its signed cardinal vector', (direction, vector) => {
    expect(directionVector(direction)).toEqual(vector);
  });

  it('wraps integer axes with positive modulo', () => {
    expect(wrapCellAxis(9, 9)).toBe(0);
    expect(wrapCellAxis(-1, 9)).toBe(8);
    expect(wrapCellAxis(18, 9)).toBe(0);
    expect(wrapCellAxis(-10, 9)).toBe(8);
  });

  it.each<GridDirection>(['+X', '-X', '+Y', '-Y', '+Z', '-Z'])('advances %s by exactly one face-adjacent cell before wrap', (direction) => {
    const from = { x: 4, y: 4, z: 4 };
    const step = advanceGridStep(from, direction);
    const delta = {
      x: Math.abs(step.to.x - from.x),
      y: Math.abs(step.to.y - from.y),
      z: Math.abs(step.to.z - from.z)
    };

    expect(delta.x + delta.y + delta.z).toBe(1);
    expect(step.from).toEqual(from);
    expect(step.direction).toBe(direction);
    expect(step.wrappedAxis).toBeNull();
    expect(step.wrapSign).toBe(0);
  });

  it.each([
    [{ x: 8, y: 4, z: 4 }, '+X', { x: 0, y: 4, z: 4 }, 'x', 1],
    [{ x: 0, y: 4, z: 4 }, '-X', { x: 8, y: 4, z: 4 }, 'x', -1],
    [{ x: 4, y: 8, z: 4 }, '+Y', { x: 4, y: 0, z: 4 }, 'y', 1],
    [{ x: 4, y: 0, z: 4 }, '-Y', { x: 4, y: 8, z: 4 }, 'y', -1],
    [{ x: 4, y: 4, z: 8 }, '+Z', { x: 4, y: 4, z: 0 }, 'z', 1],
    [{ x: 4, y: 4, z: 0 }, '-Z', { x: 4, y: 4, z: 8 }, 'z', -1]
  ] as const)('wraps %o toward %s with explicit metadata', (from, direction, to, axis, sign) => {
    expect(advanceGridStep(from, direction)).toEqual({
      from,
      to,
      direction,
      wrappedAxis: axis,
      wrapSign: sign
    });
  });

  it('maps the baseline center cell exactly to world origin', () => {
    expect(cellToWorld({ x: 4, y: 4, z: 4 })).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('separates adjacent presentation cell centers by exactly cellSize', () => {
    const a = cellToWorld({ x: 4, y: 4, z: 4 });
    const b = cellToWorld({ x: 5, y: 4, z: 4 });
    expect(b.x - a.x).toBeCloseTo(GRID_CONFIG.cellSize, 10);
    expect(b.y).toBe(a.y);
    expect(b.z).toBe(a.z);
  });

  it('round-trips cell centers through debug worldToCell', () => {
    for (const cell of [
      { x: 0, y: 0, z: 0 },
      { x: 4, y: 4, z: 4 },
      { x: 8, y: 8, z: 8 }
    ] satisfies GridCell[]) {
      expect(worldToCell(cellToWorld(cell))).toEqual(cell);
    }
  });

  it('uses the supplied config for alternate experimental grids', () => {
    const config = createGridConfig({
      resolution: 8,
      cellSize: 0.5,
      stepsPerSecond: 6,
      initialLength: 6,
      growthPerFood: 2
    });

    expect(cellKey({ x: 7, y: 7, z: 7 }, config)).toBe(511);
    expect(cellToWorld({ x: 0, y: 0, z: 0 }, config)).toEqual({ x: -1.75, y: -1.75, z: -1.75 });
  });
});
