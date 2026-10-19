import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../../src/game/grid-config';
import { COMPLETION_FOOD_TARGET } from '../../src/game/progress';
import { createRun, queueDirection, startRun, stepRun } from '../../src/game/run-state';
import { snakeHead } from '../../src/game/snake';

const stableRng = () => 0.75;

function cells(run: ReturnType<typeof createRun>) {
  return run.snake.segments.map((segment) => ({ id: segment.id, cell: { ...segment.cell } }));
}

describe('current grid RunState', () => {
  it('initializes only board-space strategic grid authority', () => {
    const run = createRun(stableRng);
    expect(run.phase).toBe('ready');
    expect(run.snake.segments).toHaveLength(GRID_CONFIG.initialLength);
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 4, z: 4 });
    expect(run.heading).toBe('+Z');
    expect(run.pendingDirection).toBeNull();
    expect(run).not.toHaveProperty('frame');
    expect(run).not.toHaveProperty('pendingTurn');
    expect(run).not.toHaveProperty('foodEaten');
  });

  it('stores exactly one valid pending world direction and newest input wins', () => {
    const run = startRun(createRun(stableRng));
    expect(queueDirection(run, '+X')).toBe(run);
    expect(run.pendingDirection).toBe('+X');
    queueDirection(run, '+Y');
    expect(run.pendingDirection).toBe('+Y');
    queueDirection(run, '-Z');
    expect(run.pendingDirection).toBe('+Y');
  });

  it('commits exactly one heading cell per strategic step with no input', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    stepRun(run, stableRng);
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 4, z: 5 });
    expect(run.heading).toBe('+Z');
    expect(run.pendingDirection).toBeNull();
    expect(run.elapsedMs).toBeCloseTo(1000 / GRID_CONFIG.stepsPerSecond, 10);
  });

  it('applies the newest pending direction once, then continues straight', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    queueDirection(run, '+X');
    queueDirection(run, '+Y');
    stepRun(run, stableRng);
    expect(run.heading).toBe('+Y');
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 5, z: 4 });
    expect(run.pendingDirection).toBeNull();
    stepRun(run, stableRng);
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 6, z: 4 });
    expect(run.heading).toBe('+Y');
  });

  it('detects collision before committing the destination cell', () => {
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
    stepRun(run, stableRng);
    expect(run.phase).toBe('game-over');
    expect(run.snake.segments).toEqual(before);
    expect(run.heading).toBe('+Z');
    expect(run.pendingDirection).toBeNull();
    expect(run.result).toMatchObject({ score: 0, foodsCollected: 0, length: 6, maxLength: 6 });
    expect(run.result).not.toHaveProperty('rulesetId');
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
  });

  it('preserves the 33-food completion target', () => {
    const run = startRun(createRun(stableRng));
    run.foodsCollected = COMPLETION_FOOD_TARGET - 1;
    run.score = COMPLETION_FOOD_TARGET - 1;
    run.food = { x: 4, y: 4, z: 5 };
    stepRun(run, stableRng);
    expect(run.phase).toBe('completed');
    expect(run.result).toMatchObject({ score: COMPLETION_FOOD_TARGET, foodsCollected: COMPLETION_FOOD_TARGET });
    expect(run.result).not.toHaveProperty('rulesetId');
  });

  it('rejects changing GridConfig after run creation', () => {
    const run = startRun(createRun(stableRng));
    expect(() => stepRun(run, stableRng, { ...run.config })).toThrow(/config cannot change/i);
  });
});
