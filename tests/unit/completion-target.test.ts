import { describe, expect, it } from 'vitest';
import {
  COMPLETION_FOOD_TARGET,
  completionProgress,
  completionProgressLabel
} from '../../src/game/progress';
import { createRun, startRun, stepRun } from '../../src/game/run-state';

describe('33-food completion contract', () => {
  it('uses exactly 33 foods as the completion target with linear progress', () => {
    expect(COMPLETION_FOOD_TARGET).toBe(33);
    expect(completionProgress(0)).toBe(0);
    expect(completionProgress(1)).toBeCloseTo(100 / 33, 10);
    expect(completionProgress(16)).toBeCloseTo((16 / 33) * 100, 10);
    expect(completionProgress(32)).toBeCloseTo((32 / 33) * 100, 10);
    expect(completionProgress(33)).toBe(100);
    expect(completionProgress(99)).toBe(100);
    expect(completionProgressLabel(1)).toBe('3.0%');
    expect(completionProgressLabel(32)).toBe('97.0%');
    expect(completionProgressLabel(33)).toBe('100.0%');
  });

  it('completes the run on the 33rd collected food', () => {
    const run = startRun(createRun(() => 0.5));
    run.snake.segments = [{ id: 0, cell: { x: 4, y: 4, z: 4 } }];
    run.snake.pendingGrowth = 0;
    run.snake.nextSegmentId = 1;
    run.heading = '+Z';
    run.pendingDirection = null;
    run.foodsCollected = 32;
    run.score = 32;
    run.foodEaten = 32;
    run.food = { x: 4, y: 4, z: 5 };

    stepRun(run, () => 0.5);

    expect(run.foodsCollected).toBe(33);
    expect(run.score).toBe(33);
    expect(run.foodEaten).toBe(33);
    expect(run.phase).toBe('completed');
    expect(run.food).toBeNull();
    expect(run.result).toMatchObject({
      foodsCollected: 33,
      score: 33,
      foodEaten: 33
    });
  });
});
