import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../../src/game/grid-config';
import { createRun, queueTurn, startRun, stepRun } from '../../src/game/run-state';
import { FixedStepClock } from '../../src/game/simulation';
import { snakeHead } from '../../src/game/snake';

const stableRng = () => 0.75;
const STEP_SECONDS = 1 / GRID_CONFIG.stepsPerSecond;

function execute(frameChunks: readonly number[]) {
  const run = startRun(createRun(stableRng));
  run.food = { x: 0, y: 0, z: 0 };
  const clock = new FixedStepClock(STEP_SECONDS);
  for (const frameDelta of frameChunks) {
    clock.consume(frameDelta, () => stepRun(run, stableRng));
  }
  return run;
}

describe('fixed-step deterministic V3 grid loop', () => {
  it('produces the same strategic state for equivalent 60 Hz and 30 Hz frame chunking', () => {
    const sixtyHz = execute(Array.from({ length: 60 }, () => 1 / 60));
    const thirtyHz = execute(Array.from({ length: 30 }, () => 1 / 30));

    expect(thirtyHz.snake.segments).toEqual(sixtyHz.snake.segments);
    expect(thirtyHz.frame).toEqual(sixtyHz.frame);
    expect(thirtyHz.pendingTurn).toBe('none');
    expect(thirtyHz.score).toBe(sixtyHz.score);
    expect(thirtyHz.phase).toBe(sixtyHz.phase);
    expect(thirtyHz.elapsedMs).toBeCloseTo(sixtyHz.elapsedMs, 10);
  });

  it('does not move strategically before the 1/6-second cell boundary', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    const clock = new FixedStepClock(STEP_SECONDS);
    const initialHead = { ...snakeHead(run.snake).cell };

    for (let tick = 0; tick < 9; tick += 1) {
      clock.consume(1 / 60, () => stepRun(run, stableRng));
    }
    expect(snakeHead(run.snake).cell).toEqual(initialHead);

    clock.consume(1 / 60, () => stepRun(run, stableRng));
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 4, z: 5 });
  });

  it('consumes a queued turn on one strategic step and then continues straight', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    const clock = new FixedStepClock(STEP_SECONDS);

    queueTurn(run, 'right');
    clock.consume(STEP_SECONDS, () => stepRun(run, stableRng));
    expect(run.frame.forward).toBe('-X');
    expect(snakeHead(run.snake).cell).toEqual({ x: 3, y: 4, z: 4 });
    expect(run.pendingTurn).toBe('none');

    clock.consume(STEP_SECONDS, () => stepRun(run, stableRng));
    expect(run.frame.forward).toBe('-X');
    expect(snakeHead(run.snake).cell).toEqual({ x: 2, y: 4, z: 4 });
  });
});
