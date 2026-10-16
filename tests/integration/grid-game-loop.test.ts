import { describe, expect, it } from 'vitest';
import { FixedStepClock } from '../../src/game/simulation';
import {
  createRun,
  queueTurnIntent,
  startRun,
  stepRun
} from '../../src/game/run-state';
import { snakeHead } from '../../src/game/snake';

const stableRng = () => 0.75;

function execute(chunks: number[]) {
  const run = startRun(createRun(stableRng));
  run.food = { x: 0, y: 0, z: 0 };
  queueTurnIntent(run, 'left');
  queueTurnIntent(run, 'up');
  for (const dt of chunks) stepRun(run, dt, stableRng);

  return {
    head: snakeHead(run.snake).cell,
    frame: run.frame,
    segments: run.snake.segments.map((segment) => ({ id: segment.id, cell: segment.cell })),
    pendingGrowth: run.snake.pendingGrowth,
    score: run.score,
    phase: run.phase,
    alpha: run.renderAlpha
  };
}

describe('V2 grid game loop determinism', () => {
  it('produces the same logical state for equivalent elapsed time chunking', () => {
    const sixtyHz = execute(Array.from({ length: 24 }, () => 1 / 60));
    const thirtyHz = execute(Array.from({ length: 12 }, () => 1 / 30));
    const irregular = execute([0.11, 0.09, 0.07, 0.13]);

    expect(thirtyHz).toEqual(sixtyHz);
    expect(irregular.head).toEqual(sixtyHz.head);
    expect(irregular.frame).toEqual(sixtyHz.frame);
    expect(irregular.segments).toEqual(sixtyHz.segments);
    expect(irregular.pendingGrowth).toBe(sixtyHz.pendingGrowth);
    expect(irregular.score).toBe(sixtyHz.score);
    expect(irregular.phase).toBe(sixtyHz.phase);
    expect(irregular.alpha).toBeCloseTo(sixtyHz.alpha, 8);
  });

  it('preserves queued turn order through bounded outer-clock stalls', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    queueTurnIntent(run, 'left');
    queueTurnIntent(run, 'up');
    const fixed = new FixedStepClock();

    fixed.consume(1, (dt) => stepRun(run, dt, stableRng));
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 4, z: 4 });
    expect(run.turnQueue.size).toBe(2);

    fixed.consume(1, (dt) => stepRun(run, dt, stableRng));
    expect(snakeHead(run.snake).cell).toEqual({ x: 5, y: 4, z: 4 });
    expect(run.frame.forward).toBe('+X');
    expect(run.turnQueue.size).toBe(1);
    expect(run.transition?.current.segments[0].cell).toEqual({ x: 5, y: 4, z: 4 });
  });
});
