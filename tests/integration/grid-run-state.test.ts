import { describe, expect, it } from 'vitest';
import { GRID_CONFIG, RULESET_ID } from '../../src/game/grid-config';
import { INITIAL_GRID_FRAME } from '../../src/game/grid-frame';
import { COMPLETION_FOOD_TARGET } from '../../src/game/progress';
import {
  createRun,
  queueTurn,
  startRun,
  stepRun
} from '../../src/game/run-state';
import { snakeHead } from '../../src/game/snake';

const stableRng = () => 0.75;

function cells(run: ReturnType<typeof createRun>) {
  return run.snake.segments.map((segment) => ({ id: segment.id, cell: { ...segment.cell } }));
}

describe('SNEK CORE V3 RunState', () => {
  it('initializes only strategic grid movement authority', () => {
    const run = createRun(stableRng);
    expect(run.phase).toBe('ready');
    expect(run.snake.segments).toHaveLength(GRID_CONFIG.initialLength);
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 4, z: 4 });
    expect(run.frame).toEqual(INITIAL_GRID_FRAME);
    expect(run.pendingTurn).toBe('none');
    expect(run).not.toHaveProperty('flight');
    expect(run).not.toHaveProperty('previousFlight');
    expect(run).not.toHaveProperty('visibleDirection');
    expect(run).not.toHaveProperty('turnQueue');
    expect(run).not.toHaveProperty('movementClock');
  });

  it('stores exactly one pending turn and latest input wins', () => {
    const run = startRun(createRun(stableRng));
    expect(queueTurn(run, 'right')).toBe(run);
    expect(run.pendingTurn).toBe('right');
    queueTurn(run, 'up');
    expect(run.pendingTurn).toBe('up');
    expect(run).not.toHaveProperty('turnQueue');
  });

  it('commits exactly one forward cell per strategic step with no input', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };

    stepRun(run, stableRng);

    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 4, z: 5 });
    expect(run.frame).toEqual(INITIAL_GRID_FRAME);
    expect(run.pendingTurn).toBe('none');
    expect(run.elapsedMs).toBeCloseTo(1000 / GRID_CONFIG.stepsPerSecond, 10);
  });

  it('applies the newest pending turn once, then clears it', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    queueTurn(run, 'right');
    queueTurn(run, 'up');

    stepRun(run, stableRng);

    expect(run.frame).toEqual({ forward: '+Y', right: '-X', up: '-Z' });
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 5, z: 4 });
    expect(run.pendingTurn).toBe('none');

    stepRun(run, stableRng);
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 6, z: 4 });
    expect(run.frame.forward).toBe('+Y');
  });

  it('detects collision before committing either cell or frame', () => {
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
    const before = cells(run);
    const frameBefore = run.frame;

    stepRun(run, stableRng);

    expect(run.phase).toBe('game-over');
    expect(run.snake.segments).toEqual(before);
    expect(run.frame).toEqual(frameBefore);
    expect(run.pendingTurn).toBe('none');
    expect(run.result).toMatchObject({
      rulesetId: RULESET_ID,
      score: 0,
      foodsCollected: 0,
      length: 6,
      maxLength: 6
    });
  });

  it('collects food only on the committed destination and preserves +2 growth', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 4, y: 4, z: 5 };

    stepRun(run, stableRng);

    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 4, z: 5 });
    expect(run.foodsCollected).toBe(1);
    expect(run.score).toBe(1);
    expect(run.snake.pendingGrowth).toBe(GRID_CONFIG.growthPerFood);

    run.food = { x: 0, y: 0, z: 0 };
    stepRun(run, stableRng);
    stepRun(run, stableRng);
    expect(run.snake.pendingGrowth).toBe(0);
    expect(run.snake.segments).toHaveLength(GRID_CONFIG.initialLength + GRID_CONFIG.growthPerFood);
    expect(run.maxLength).toBe(GRID_CONFIG.initialLength + GRID_CONFIG.growthPerFood);
  });

  it('preserves the completion target under the active ruleset', () => {
    const run = startRun(createRun(stableRng));
    run.foodsCollected = COMPLETION_FOOD_TARGET - 1;
    run.score = COMPLETION_FOOD_TARGET - 1;
    run.food = { x: 4, y: 4, z: 5 };

    stepRun(run, stableRng);

    expect(run.phase).toBe('completed');
    expect(run.score).toBe(COMPLETION_FOOD_TARGET);
    expect(run.result).toMatchObject({
      rulesetId: RULESET_ID,
      score: COMPLETION_FOOD_TARGET,
      foodsCollected: COMPLETION_FOOD_TARGET
    });
  });

  it('rejects changing GridConfig after run creation', () => {
    const run = startRun(createRun(stableRng));
    const otherConfig = { ...run.config };
    expect(() => stepRun(run, stableRng, otherConfig)).toThrow(/config cannot change/i);
  });
});
