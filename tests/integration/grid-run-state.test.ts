import { describe, expect, it } from 'vitest';
import { GRID_CONFIG, RULESET_ID } from '../../src/game/grid-config';
import { advanceGridStep } from '../../src/game/grid-topology';
import { COMPLETION_FOOD_TARGET } from '../../src/game/progress';
import {
  createRun,
  queueTurnIntent,
  startRun,
  stepRun
} from '../../src/game/run-state';
import { snakeHead } from '../../src/game/snake';

const stableRng = () => 0.75;

function nextForwardCell(run: ReturnType<typeof createRun>) {
  return advanceGridStep(snakeHead(run.snake).cell, run.frame.forward).to;
}

describe('Pixel Flight Grid V2 RunState', () => {
  it('creates a ready run with integer-authoritative baseline state', () => {
    const run = createRun(stableRng);

    expect(run.phase).toBe('ready');
    expect(run.snake.segments).toHaveLength(GRID_CONFIG.initialLength);
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 4, z: 4 });
    expect(run.frame).toEqual({ forward: '+Z', right: '-X', up: '+Y' });
    expect(run.food).not.toBeNull();
    expect(run.foodsCollected).toBe(0);
    expect(run.maxLength).toBe(6);
    expect(run.transition).toBeNull();
    expect(run.renderAlpha).toBe(0);
  });

  it('owns a capacity-2 FIFO and consumes at most one intent per cell commit', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };

    expect(queueTurnIntent(run, 'left')).toBe(true);
    expect(queueTurnIntent(run, 'up')).toBe(true);
    expect(queueTurnIntent(run, 'right')).toBe(false);

    stepRun(run, 1 / 6, stableRng);
    expect(snakeHead(run.snake).cell).toEqual({ x: 5, y: 4, z: 4 });
    expect(run.frame.forward).toBe('+X');
    expect(run.turnQueue.size).toBe(1);

    stepRun(run, 1 / 6, stableRng);
    expect(snakeHead(run.snake).cell).toEqual({ x: 5, y: 5, z: 4 });
    expect(run.frame.forward).toBe('+Y');
    expect(run.turnQueue.size).toBe(0);
  });

  it('commits movement at six cell steps per second rather than every outer tick', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };

    for (let index = 0; index < 9; index += 1) stepRun(run, 1 / 60, stableRng);
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 4, z: 4 });
    expect(run.transition).toBeNull();
    expect(run.renderAlpha).toBeCloseTo(0.9, 8);

    stepRun(run, 1 / 60, stableRng);
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 4, z: 5 });
    expect(run.transition).not.toBeNull();
    expect(run.renderAlpha).toBeCloseTo(0, 8);
  });

  it('scores food by foodsCollected and queues exactly +2 growth', () => {
    const run = startRun(createRun(stableRng));
    run.food = nextForwardCell(run);

    stepRun(run, 1 / 6, stableRng);

    expect(run.foodsCollected).toBe(1);
    expect(run.score).toBe(1);
    expect(run.snake.pendingGrowth).toBe(2);
    expect(run.snake.segments).toHaveLength(6);

    run.food = { x: 0, y: 0, z: 0 };
    stepRun(run, 1 / 6, stableRng);
    stepRun(run, 1 / 6, stableRng);

    expect(run.snake.pendingGrowth).toBe(0);
    expect(run.snake.segments).toHaveLength(8);
    expect(run.maxLength).toBe(8);
  });

  it('finalizes collision before mutating into invalid duplicate occupancy', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    run.snake.segments = [
      { id: 0, cell: { x: 4, y: 4, z: 4 } },
      { id: 1, cell: { x: 4, y: 4, z: 3 } },
      { id: 2, cell: { x: 4, y: 4, z: 5 } },
      { id: 3, cell: { x: 3, y: 4, z: 5 } },
      { id: 4, cell: { x: 3, y: 4, z: 4 } },
      { id: 5, cell: { x: 3, y: 4, z: 3 } }
    ];
    const before = run.snake.segments.map((segment) => ({ id: segment.id, cell: { ...segment.cell } }));

    stepRun(run, 1 / 6, stableRng);

    expect(run.phase).toBe('game-over');
    expect(run.snake.segments).toEqual(before);
    expect(run.result).toMatchObject({
      rulesetId: RULESET_ID,
      score: 0,
      foodsCollected: 0,
      length: 6,
      maxLength: 6
    });
  });

  it('preserves the provisional 300-food completion contract', () => {
    const run = startRun(createRun(stableRng));
    run.foodsCollected = COMPLETION_FOOD_TARGET - 1;
    run.score = COMPLETION_FOOD_TARGET - 1;
    run.food = nextForwardCell(run);

    stepRun(run, 1 / 6, stableRng);

    expect(run.foodsCollected).toBe(COMPLETION_FOOD_TARGET);
    expect(run.score).toBe(COMPLETION_FOOD_TARGET);
    expect(run.phase).toBe('completed');
    expect(run.result).toMatchObject({
      rulesetId: RULESET_ID,
      score: COMPLETION_FOOD_TARGET,
      foodsCollected: COMPLETION_FOOD_TARGET
    });
  });

  it('publishes immutable before/after logical snapshots only after a committed step', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };

    stepRun(run, 1 / 6, stableRng);
    const transition = run.transition;
    expect(transition).not.toBeNull();
    if (!transition) return;

    expect(transition.previous.segments[0].cell).toEqual({ x: 4, y: 4, z: 4 });
    expect(transition.current.segments[0].cell).toEqual({ x: 4, y: 4, z: 5 });
    expect(transition.headStep.from).toEqual({ x: 4, y: 4, z: 4 });
    expect(transition.headStep.to).toEqual({ x: 4, y: 4, z: 5 });
    expect(Object.isFrozen(transition)).toBe(true);
    expect(Object.isFrozen(transition.previous)).toBe(true);
    expect(Object.isFrozen(transition.previous.segments)).toBe(true);

    run.snake.segments[0] = { id: 0, cell: { x: 8, y: 8, z: 8 } };
    expect(transition.current.segments[0].cell).toEqual({ x: 4, y: 4, z: 5 });
  });
});
