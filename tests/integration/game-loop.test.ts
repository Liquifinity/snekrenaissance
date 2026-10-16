import { describe, expect, it } from 'vitest';
import { GROWTH_PER_FOOD, INITIAL_BODY_SEGMENTS, SEGMENT_SPACING, WORLD_SIZE } from '../../src/game/constants';
import { createRun, startRun, stepRun } from '../../src/game/run-state';

const neutral = { yaw: 0, pitch: 0 };
const stableRng = () => 0.75;

describe('canonical growth loop', () => {
  it('keeps length equal to 12 + foodEaten * 4 after every safe pickup', () => {
    let run = startRun(createRun(stableRng));

    // This fixture holds the head stationary. In a toroidal cube, the straight
    // body begins meeting its own wrapped image once its sampled trail approaches
    // one full world circumference. Three pickups keep the body span below that
    // boundary: (12 + 3 * 4) * SEGMENT_SPACING < WORLD_SIZE.
    expect((INITIAL_BODY_SEGMENTS + 3 * GROWTH_PER_FOOD) * SEGMENT_SPACING).toBeLessThan(WORLD_SIZE);

    for (let pickups = 1; pickups <= 3; pickups += 1) {
      run.food = { ...run.headWrapped };
      run = stepRun(run, neutral, 0, stableRng);

      expect(run.foodEaten).toBe(pickups);
      expect(run.snake.segmentCount).toBe(INITIAL_BODY_SEGMENTS + pickups * GROWTH_PER_FOOD);
      expect(run.maxLength).toBe(run.snake.segmentCount);
      expect(run.phase).toBe('playing');
    }
  });
});
