import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../../src/game/grid-config';
import { INITIAL_GRID_FRAME } from '../../src/game/grid-frame';
import {
  GridMovementClock,
  TURN_QUEUE_CAPACITY,
  TurnIntentQueue,
  advanceGridMovement
} from '../../src/game/grid-movement';

describe('discrete grid movement', () => {
  it('moves forward from the center by exactly one cell', () => {
    const result = advanceGridMovement({ x: 4, y: 4, z: 4 }, INITIAL_GRID_FRAME, 'none');
    expect(result.cell).toEqual({ x: 4, y: 4, z: 5 });
    expect(result.frame).toEqual(INITIAL_GRID_FRAME);
  });

  it('applies one local left turn before committing the next cell', () => {
    const result = advanceGridMovement({ x: 4, y: 4, z: 4 }, INITIAL_GRID_FRAME, 'left');
    expect(result.cell).toEqual({ x: 5, y: 4, z: 4 });
    expect(result.frame.forward).toBe('+X');
  });

  it('never produces a logical diagonal transition', () => {
    for (const intent of ['none', 'left', 'right', 'up', 'down'] as const) {
      const start = { x: 4, y: 4, z: 4 };
      const result = advanceGridMovement(start, INITIAL_GRID_FRAME, intent);
      const changedAxes = [
        result.cell.x !== start.x,
        result.cell.y !== start.y,
        result.cell.z !== start.z
      ].filter(Boolean).length;
      expect(changedAxes).toBe(1);
    }
  });

  it('wraps after exactly one adjacent step', () => {
    const result = advanceGridMovement({ x: 4, y: 4, z: 8 }, INITIAL_GRID_FRAME, 'none');
    expect(result.cell).toEqual({ x: 4, y: 4, z: 0 });
    expect(result.step.wrappedAxis).toBe('z');
    expect(result.step.wrapSign).toBe(1);
  });
});

describe('TurnIntentQueue', () => {
  it('is a capacity-2 FIFO and rejects a third intent without replacement', () => {
    expect(TURN_QUEUE_CAPACITY).toBe(2);
    const queue = new TurnIntentQueue();
    expect(queue.enqueue('left')).toBe(true);
    expect(queue.enqueue('up')).toBe(true);
    expect(queue.enqueue('right')).toBe(false);
    expect(queue.size).toBe(2);
    expect(queue.shift()).toBe('left');
    expect(queue.shift()).toBe('up');
    expect(queue.shift()).toBe('none');
  });

  it('clears all queued intents', () => {
    const queue = new TurnIntentQueue();
    queue.enqueue('down');
    queue.enqueue('right');
    queue.clear();
    expect(queue.size).toBe(0);
    expect(queue.shift()).toBe('none');
  });
});

describe('GridMovementClock', () => {
  it('commits exactly six logical steps per simulated second at baseline', () => {
    const clock = new GridMovementClock(GRID_CONFIG.stepsPerSecond);
    let commits = 0;
    expect(clock.consume(1, () => { commits += 1; })).toBe(6);
    expect(commits).toBe(6);
    expect(clock.alpha).toBeCloseTo(0, 10);
  });

  it('is invariant to equivalent dt chunking and preserves residual alpha', () => {
    const run = (chunks: number[]) => {
      const clock = new GridMovementClock(6);
      let commits = 0;
      for (const dt of chunks) clock.consume(dt, () => { commits += 1; });
      return { commits, alpha: clock.alpha };
    };

    const sixtyHz = run(Array.from({ length: 61 }, () => 1 / 60));
    const thirtyHz = run(Array.from({ length: 30 }, () => 1 / 30).concat([1 / 60]));
    const irregular = run([0.11, 0.07, 0.2, 0.03, 0.19, 0.17, 0.08, 1 / 6]);

    expect(sixtyHz.commits).toBe(6);
    expect(thirtyHz.commits).toBe(6);
    expect(sixtyHz.alpha).toBeCloseTo(0.1, 8);
    expect(thirtyHz.alpha).toBeCloseTo(sixtyHz.alpha, 8);
    expect(irregular.commits).toBe(6);
    expect(irregular.alpha).toBeCloseTo(0.1, 8);
  });

  it('resets accumulated presentation alpha', () => {
    const clock = new GridMovementClock(6);
    clock.consume(0.1, () => undefined);
    expect(clock.alpha).toBeGreaterThan(0);
    clock.reset();
    expect(clock.alpha).toBe(0);
  });
});
