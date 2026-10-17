import { describe, expect, it } from 'vitest';
import { GRID_CONFIG, RULESET_ID } from '../../src/game/grid-config';
import { COMPLETION_FOOD_TARGET } from '../../src/game/progress';
import {
  createRun,
  processGridEntries,
  startRun,
  stepRun
} from '../../src/game/run-state';
import { snakeHead } from '../../src/game/snake';

const stableRng = () => 0.75;
const neutral = Object.freeze({ yaw: 0, pitch: 0 });

function entry(x: number, y: number, z: number, tEnter = 0.5) {
  return Object.freeze({ cell: Object.freeze({ x, y, z }), tEnter });
}

describe('Pixel Flight Grid V2.1 RunState', () => {
  it('uses the V2.1 ruleset and initializes continuous flight at the strategic head center', () => {
    const run = createRun(stableRng);

    expect(RULESET_ID).toBe('pixel-flight-grid-v2-1');
    expect(run.phase).toBe('ready');
    expect(run.snake.segments).toHaveLength(GRID_CONFIG.initialLength);
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 4, z: 4 });
    expect(run.flight.unwrappedPosition).toEqual({ x: 4.5, y: 4.5, z: 4.5 });
    expect(run.flight.wrappedPosition).toEqual({ x: 4.5, y: 4.5, z: 4.5 });
    expect(run.flight.forward).toEqual({ x: 0, y: 0, z: 1 });
    expect(run.previousFlight).toBe(run.flight);
    expect(run).not.toHaveProperty('frame');
    expect(run).not.toHaveProperty('turnQueue');
    expect(run).not.toHaveProperty('movementClock');
    expect(run).not.toHaveProperty('transition');
    expect(run).not.toHaveProperty('renderAlpha');
  });

  it('updates steering and flight pose inside a cell without advancing strategic occupancy', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    const beforeCells = run.snake.segments.map((segment) => ({ ...segment.cell }));

    stepRun(run, { yaw: 1, pitch: 0 }, 1 / 60, stableRng);

    expect(run.flight.orientation.yaw).toBeGreaterThan(0);
    expect(run.flight.unwrappedPosition).not.toEqual(run.previousFlight.unwrappedPosition);
    expect(run.snake.segments.map((segment) => segment.cell)).toEqual(beforeCells);
  });

  it('commits strategic occupancy exactly when continuous flight enters the next cell', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };

    stepRun(run, neutral, 0.09, stableRng);

    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 4, z: 5 });
    expect(run.flight.unwrappedPosition.z).toBeCloseTo(5.04, 12);
  });

  it('collects food on exact cell entry and consumes +2 growth on later entries', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 4, y: 4, z: 5 };

    stepRun(run, neutral, 0.09, stableRng);

    expect(run.foodsCollected).toBe(1);
    expect(run.score).toBe(1);
    expect(run.snake.pendingGrowth).toBe(2);
    expect(run.snake.segments).toHaveLength(6);

    run.food = { x: 0, y: 0, z: 0 };
    processGridEntries(run, [entry(4, 4, 6), entry(4, 4, 7)], stableRng);

    expect(run.snake.pendingGrowth).toBe(0);
    expect(run.snake.segments).toHaveLength(8);
    expect(run.maxLength).toBe(8);
  });

  it('checks exact self-collision before committing an invalid occupied cell', () => {
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

    processGridEntries(run, [entry(4, 4, 5)], stableRng);

    expect(run.phase).toBe('game-over');
    expect(run.snake.segments).toEqual(before);
    expect(run.result).toMatchObject({
      rulesetId: 'pixel-flight-grid-v2-1',
      score: 0,
      foodsCollected: 0,
      length: 6,
      maxLength: 6
    });
  });

  it('processes multi-cell entries in order and stops immediately at the first collision', () => {
    const run = startRun(createRun(stableRng));
    run.snake.segments = [
      { id: 0, cell: { x: 4, y: 4, z: 4 } },
      { id: 1, cell: { x: 3, y: 4, z: 4 } },
      { id: 2, cell: { x: 2, y: 4, z: 4 } },
      { id: 3, cell: { x: 2, y: 4, z: 5 } },
      { id: 4, cell: { x: 3, y: 4, z: 5 } },
      { id: 5, cell: { x: 4, y: 4, z: 5 } }
    ];
    run.food = { x: 6, y: 4, z: 4 };

    processGridEntries(run, [
      entry(5, 4, 4, 0.2),
      entry(4, 4, 4, 0.4),
      entry(6, 4, 4, 0.6)
    ], stableRng);

    expect(run.phase).toBe('game-over');
    expect(snakeHead(run.snake).cell).toEqual({ x: 5, y: 4, z: 4 });
    expect(run.foodsCollected).toBe(0);
    expect(run.food).toEqual({ x: 6, y: 4, z: 4 });
  });

  it('preserves the 300-food completion contract and V2.1 result identity', () => {
    const run = startRun(createRun(stableRng));
    run.foodsCollected = COMPLETION_FOOD_TARGET - 1;
    run.score = COMPLETION_FOOD_TARGET - 1;
    run.food = { x: 4, y: 4, z: 5 };

    processGridEntries(run, [entry(4, 4, 5)], stableRng);

    expect(run.foodsCollected).toBe(COMPLETION_FOOD_TARGET);
    expect(run.score).toBe(COMPLETION_FOOD_TARGET);
    expect(run.phase).toBe('completed');
    expect(run.result).toMatchObject({
      rulesetId: 'pixel-flight-grid-v2-1',
      score: COMPLETION_FOOD_TARGET,
      foodsCollected: COMPLETION_FOOD_TARGET
    });
  });
});
