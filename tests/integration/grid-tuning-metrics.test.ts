import { describe, expect, it } from 'vitest';
import { createGridConfig } from '../../src/game/grid-config';
import { INITIAL_GRID_FRAME } from '../../src/game/grid-frame';
import {
  GridMetricsTracker,
  occupancyRatio,
  safeMoveCount
} from '../../src/game/metrics';
import type { GridSnakeState } from '../../src/game/snake';

const config = createGridConfig({
  resolution: 3,
  cellSize: 1,
  stepsPerSecond: 6,
  initialLength: 2,
  growthPerFood: 1
});

function snake(cells: Array<[number, number, number]>, pendingGrowth = 0): GridSnakeState {
  return {
    segments: cells.map(([x, y, z], id) => ({ id, cell: { x, y, z } })),
    pendingGrowth,
    nextSegmentId: cells.length
  };
}

describe('grid tuning metrics', () => {
  it('computes occupancy from exact occupied cells', () => {
    expect(occupancyRatio(snake([[1, 1, 1], [1, 1, 0]]), config)).toBeCloseTo(2 / 27, 12);
  });

  it('counts legal immediate forward/left/right/up/down targets using gameplay collision semantics', () => {
    const open = snake([[1, 1, 1], [1, 1, 0]]);
    expect(safeMoveCount(open, INITIAL_GRID_FRAME, config)).toBe(5);

    const constrained = snake([
      [1, 1, 1],
      [1, 1, 0],
      [2, 1, 1],
      [0, 1, 1],
      [1, 2, 1]
    ]);
    expect(safeMoveCount(constrained, INITIAL_GRID_FRAME, config)).toBe(2);
  });

  it('uses the tail-vacate rule when evaluating safe moves', () => {
    const tailAhead = snake([[1, 1, 1], [1, 1, 2]]);
    expect(safeMoveCount(tailAhead, INITIAL_GRID_FRAME, config)).toBe(5);

    const retainedTail = snake([[1, 1, 1], [1, 1, 2]], 1);
    expect(safeMoveCount(retainedTail, INITIAL_GRID_FRAME, config)).toBe(4);
  });

  it('tracks first pressure/confinement time and near-body encounters', () => {
    const tracker = new GridMetricsTracker();
    const pressured = snake([
      [1, 1, 1],
      [1, 1, 0],
      [2, 1, 1],
      [0, 1, 1],
      [1, 2, 1]
    ]);
    tracker.observe(pressured, INITIAL_GRID_FRAME, 500, config);
    const first = tracker.snapshot();
    expect(first.safeMoveCount).toBe(2);
    expect(first.firstPressureMs).toBe(500);
    expect(first.firstConfinementMs).toBeNull();
    expect(first.nearBodyEncounters).toBeGreaterThanOrEqual(1);

    const confined = snake([
      [1, 1, 1],
      [1, 1, 0],
      [2, 1, 1],
      [0, 1, 1],
      [1, 2, 1],
      [1, 0, 1]
    ]);
    tracker.observe(confined, INITIAL_GRID_FRAME, 900, config);
    const second = tracker.snapshot();
    expect(second.safeMoveCount).toBe(1);
    expect(second.firstPressureMs).toBe(500);
    expect(second.firstConfinementMs).toBe(900);
  });
});
