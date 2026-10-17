import { describe, expect, it } from 'vitest';
import { createRun, startRun, stepRun } from '../../src/game/run-state';
import { FixedStepClock } from '../../src/game/simulation';
import { snakeHead } from '../../src/game/snake';

const stableRng = () => 0.75;
const neutral = Object.freeze({ yaw: 0, pitch: 0 });

function snapshot(run: ReturnType<typeof createRun>) {
  return {
    flight: {
      unwrappedPosition: { ...run.flight.unwrappedPosition },
      wrappedPosition: { ...run.flight.wrappedPosition },
      orientation: { ...run.flight.orientation },
      forward: { ...run.flight.forward }
    },
    segments: run.snake.segments.map((segment) => ({ id: segment.id, cell: { ...segment.cell } })),
    pendingGrowth: run.snake.pendingGrowth,
    score: run.score,
    phase: run.phase
  };
}

function executeFrames(chunks: readonly number[], input = Object.freeze({ yaw: 0.25, pitch: -0.1 })) {
  const run = startRun(createRun(stableRng));
  run.food = { x: 0, y: 0, z: 0 };
  const fixed = new FixedStepClock();

  for (const frameDt of chunks) {
    fixed.consume(frameDt, (dt) => stepRun(run, input, dt, stableRng));
  }
  return snapshot(run);
}

describe('V2.1 continuous grid game loop', () => {
  it('produces the same simulation state for equivalent fixed-step frame chunking', () => {
    const sixtyHz = executeFrames(Array.from({ length: 12 }, () => 1 / 60));
    const thirtyHz = executeFrames(Array.from({ length: 6 }, () => 1 / 30));

    expect(thirtyHz).toEqual(sixtyHz);
  });

  it('applies held steering on every fixed tick without a queued turn gate', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    const fixed = new FixedStepClock();
    const yaws: number[] = [];

    for (let index = 0; index < 4; index += 1) {
      fixed.consume(1 / 60, (dt) => stepRun(run, { yaw: 1, pitch: 0 }, dt, stableRng));
      yaws.push(run.flight.orientation.yaw);
    }

    expect(yaws[0]).toBeGreaterThan(0);
    expect(yaws[1]).toBeGreaterThan(yaws[0] ?? 0);
    expect(yaws[2]).toBeGreaterThan(yaws[1] ?? 0);
    expect(yaws[3]).toBeGreaterThan(yaws[2] ?? 0);
    expect(run).not.toHaveProperty('turnQueue');
  });

  it('neutral input stops angular change immediately with no stale command', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    const fixed = new FixedStepClock();

    for (let index = 0; index < 3; index += 1) {
      fixed.consume(1 / 60, (dt) => stepRun(run, { yaw: 1, pitch: 0 }, dt, stableRng));
    }
    const yawAfterSteering = run.flight.orientation.yaw;

    for (let index = 0; index < 5; index += 1) {
      fixed.consume(1 / 60, (dt) => stepRun(run, neutral, dt, stableRng));
    }

    expect(run.flight.orientation.yaw).toBe(yawAfterSteering);
  });

  it('updates occupancy only after the continuous head crosses a cell boundary', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    const fixed = new FixedStepClock();

    for (let index = 0; index < 4; index += 1) {
      fixed.consume(1 / 60, (dt) => stepRun(run, neutral, dt, stableRng));
    }
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 4, z: 4 });

    for (let index = 0; index < 2; index += 1) {
      fixed.consume(1 / 60, (dt) => stepRun(run, neutral, dt, stableRng));
    }
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 4, z: 5 });
  });
});
