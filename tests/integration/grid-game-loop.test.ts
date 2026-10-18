import { describe, expect, it } from 'vitest';
import { createRun, startRun, stepRun } from '../../src/game/run-state';
import { FixedStepClock } from '../../src/game/simulation';
import { snakeHead } from '../../src/game/snake';

const stableRng = () => 0.75;
const steering = { yaw: 0.35, pitch: -0.2 } as const;

function execute(frameChunks: readonly number[]) {
  const run = startRun(createRun(stableRng));
  run.food = { x: 0, y: 0, z: 0 };
  const clock = new FixedStepClock();
  for (const frameDelta of frameChunks) {
    clock.consume(frameDelta, (dt) => stepRun(run, steering, dt, stableRng));
  }
  return run;
}

describe('fixed-step continuous navigation with discrete visible direction', () => {
  it('produces the same simulation for equivalent 60 Hz and 30 Hz frame chunking', () => {
    const sixtyHz = execute(Array.from({ length: 24 }, () => 1 / 60));
    const thirtyHz = execute(Array.from({ length: 12 }, () => 1 / 30));

    expect(thirtyHz.flight.orientation.yaw).toBeCloseTo(sixtyHz.flight.orientation.yaw, 12);
    expect(thirtyHz.flight.orientation.pitch).toBeCloseTo(sixtyHz.flight.orientation.pitch, 12);
    expect(thirtyHz.flight.unwrappedPosition.x).toBeCloseTo(sixtyHz.flight.unwrappedPosition.x, 12);
    expect(thirtyHz.flight.unwrappedPosition.y).toBeCloseTo(sixtyHz.flight.unwrappedPosition.y, 12);
    expect(thirtyHz.flight.unwrappedPosition.z).toBeCloseTo(sixtyHz.flight.unwrappedPosition.z, 12);
    expect(thirtyHz.snake.segments).toEqual(sixtyHz.snake.segments);
    expect(thirtyHz.visibleDirection).toBe(sixtyHz.visibleDirection);
    expect(thirtyHz.score).toBe(sixtyHz.score);
    expect(thirtyHz.phase).toBe(sixtyHz.phase);
  });

  it('responds to held steering on every fixed tick before the first cell entry without changing visible direction', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    const clock = new FixedStepClock();
    const initialHead = { ...snakeHead(run.snake).cell };
    let previousYaw = run.flight.orientation.yaw;

    for (let tick = 0; tick < 4; tick += 1) {
      clock.consume(1 / 60, (dt) => stepRun(run, { yaw: 1, pitch: 0 }, dt, stableRng));
      expect(run.flight.orientation.yaw).toBeGreaterThan(previousYaw);
      expect(run.visibleDirection).toBe('+Z');
      previousYaw = run.flight.orientation.yaw;
    }

    expect(snakeHead(run.snake).cell).toEqual(initialHead);
  });

  it('neutral input creates no historical command that can execute later', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    const clock = new FixedStepClock();

    clock.consume(1 / 60, (dt) => stepRun(run, { yaw: 1, pitch: 0 }, dt, stableRng));
    const releasedYaw = run.flight.orientation.yaw;

    for (let tick = 0; tick < 20; tick += 1) {
      clock.consume(1 / 60, (dt) => stepRun(run, { yaw: 0, pitch: 0 }, dt, stableRng));
    }

    expect(run.flight.orientation.yaw).toBeCloseTo(releasedYaw, 12);
  });
});
