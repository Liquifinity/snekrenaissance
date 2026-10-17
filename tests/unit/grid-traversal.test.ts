import { describe, expect, it } from 'vitest';
import { GRID_CONFIG, createGridConfig } from '../../src/game/grid-config';
import type { GridPoint } from '../../src/game/flight';
import { traverseGridSegment } from '../../src/game/grid-traversal';

function cells(from: GridPoint, to: GridPoint, resolution = GRID_CONFIG.resolution) {
  const config = resolution === GRID_CONFIG.resolution
    ? GRID_CONFIG
    : createGridConfig({
        resolution,
        cellSize: 0.4,
        stepsPerSecond: 6,
        initialLength: Math.min(6, resolution ** 3),
        growthPerFood: 2
      });
  return traverseGridSegment(from, to, config).map((entry) => entry.cell);
}

describe('toroidal continuous voxel traversal', () => {
  it('emits no entry while the segment remains in one cell', () => {
    expect(cells({ x: 0.2, y: 0.3, z: 0.4 }, { x: 0.9, y: 0.8, z: 0.7 })).toEqual([]);
  });

  it('emits one entered cell with its normalized entry parameter', () => {
    const entries = traverseGridSegment(
      { x: 0.5, y: 0.5, z: 0.5 },
      { x: 1.1, y: 0.5, z: 0.5 },
      GRID_CONFIG
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.cell).toEqual({ x: 1, y: 0, z: 0 });
    expect(entries[0]?.tEnter).toBeCloseTo(5 / 6, 12);
  });

  it('emits every crossed cell in order on a multi-cell segment', () => {
    expect(cells(
      { x: 0.5, y: 2.5, z: 4.5 },
      { x: 3.2, y: 2.5, z: 4.5 }
    )).toEqual([
      { x: 1, y: 2, z: 4 },
      { x: 2, y: 2, z: 4 },
      { x: 3, y: 2, z: 4 }
    ]);
  });

  it('canonicalizes positive and negative toroidal crossings', () => {
    expect(cells(
      { x: 8.8, y: 4.5, z: 4.5 },
      { x: 9.2, y: 4.5, z: 4.5 }
    )).toEqual([{ x: 0, y: 4, z: 4 }]);

    expect(cells(
      { x: 0.2, y: 4.5, z: 4.5 },
      { x: -0.2, y: 4.5, z: 4.5 }
    )).toEqual([{ x: 8, y: 4, z: 4 }]);
  });

  it('treats a two-axis corner crossing as one geometric event', () => {
    expect(cells(
      { x: 0.5, y: 0.5, z: 0.5 },
      { x: 1.5, y: 1.5, z: 0.5 }
    )).toEqual([{ x: 1, y: 1, z: 0 }]);
  });

  it('treats a three-axis corner crossing as one geometric event', () => {
    expect(cells(
      { x: 0.5, y: 0.5, z: 0.5 },
      { x: 1.5, y: 1.5, z: 1.5 }
    )).toEqual([{ x: 1, y: 1, z: 1 }]);
  });

  it('includes a boundary reached exactly at segment end', () => {
    expect(cells(
      { x: 0.5, y: 0.5, z: 0.5 },
      { x: 1.0, y: 0.5, z: 0.5 }
    )).toEqual([{ x: 1, y: 0, z: 0 }]);
  });

  it('does not tunnel through intermediate cells at high speed', () => {
    expect(cells(
      { x: 7.5, y: 1.5, z: 1.5 },
      { x: 11.5, y: 1.5, z: 1.5 }
    )).toEqual([
      { x: 8, y: 1, z: 1 },
      { x: 0, y: 1, z: 1 },
      { x: 1, y: 1, z: 1 },
      { x: 2, y: 1, z: 1 },
      { x: 3, y: 1, z: 1 }
    ]);
  });

  it('suppresses duplicate canonical cells within one long segment', () => {
    const traversed = cells(
      { x: 0.5, y: 0.5, z: 0.5 },
      { x: 8.5, y: 0.5, z: 0.5 },
      3
    );
    expect(traversed).toEqual([
      { x: 1, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 }
    ]);
  });

  it('rejects non-finite trajectory coordinates', () => {
    expect(() => traverseGridSegment(
      { x: Number.NaN, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      GRID_CONFIG
    )).toThrow(RangeError);
  });
});
