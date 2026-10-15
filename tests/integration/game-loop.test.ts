import { describe, expect, it } from 'vitest';
import { GROWTH_PER_FOOD, INITIAL_BODY_SEGMENTS } from '../../src/game/constants';
import { createRun, startRun, stepRun } from '../../src/game/run-state';

const neutral = { yaw: 0, pitch: 0 };
const stableRng = () => 0.75;

describe('canonical growth loop', () => {
  it('keeps length equal to 12 + foodEaten * 4 after every pickup', () => {
    let run = startRun(createRun(stableRng));

    for (let pickups = 1; pickups <= 5; pickups += 1) {
      run.food = { ...run.headWrapped };
      run = stepRun(run, neutral, 0, stableRng);

      expect(run.foodEaten).toBe(pickups);
      expect(run.snake.segmentCount).toBe(INITIAL_BODY_SEGMENTS + pickups * GROWTH_PER_FOOD);
      expect(run.maxLength).toBe(run.snake.segmentCount);
      expect(run.phase).toBe('playing');
    }
  });
});
