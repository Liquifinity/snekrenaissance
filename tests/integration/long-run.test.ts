import { describe, expect, it } from 'vitest';
import {
  SNAKE_SPEED,
  TRAIL_RESERVE_SEGMENTS
} from '../../src/game/constants';
import { createRun, startRun, stepRun } from '../../src/game/run-state';

const stableRng = () => 0.75;

describe('long player session', () => {
  it('keeps trail memory proportional to current snake length', () => {
    const run = startRun(createRun(stableRng));

    for (let step = 0; step < 3600; step += 1) {
      stepRun(run, { yaw: 0, pitch: 0 }, 1 / 60, stableRng);
      expect(run.phase).toBe('playing');
    }

    const retainedDistance =
      (run.snake.segmentCount + TRAIL_RESERVE_SEGMENTS) * run.snake.segmentSpacing;
    const distancePerStep = SNAKE_SPEED / 60;
    const expectedUpperBound = Math.ceil(retainedDistance / distancePerStep) + 8;

    expect(run.trail.length).toBeLessThanOrEqual(expectedUpperBound);
  });
});
