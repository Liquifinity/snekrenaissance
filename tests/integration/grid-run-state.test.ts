import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../../src/game/grid-config';
import { createInitialFlightPose } from '../../src/game/flight';
import { COMPLETION_FOOD_TARGET } from '../../src/game/progress';
import {
  createRun,
  processGridEntries,
  startRun,
  stepRun
} from '../../src/game/run-state';
import { snakeHead } from '../../src/game/snake';

const stableRng = () => 0.75;
const neutral = { yaw: 0, pitch: 0 } as const;

describe('Pixel Flight Grid V2.1 RunState', () => {
  it('initializes flight at the strategic head center with no discrete movement authority', () => {
    const run = createRun(stableRng);
    expect(run.phase).toBe('ready');
    expect(run.snake.segments).toHaveLength(GRID_CONFIG.initialLength);
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 4, z: 4 });
    expect(run.flight.unwrappedPosition).toEqual({ x: 4.5, y: 4.5, z: 4.5 });
    expect(run.flight.forward).toEqual({ x: 0, y: 0, z: 1 });
    expect(run.previousFlight).toBe(run.flight);
    expect(run).not.toHaveProperty('frame');
    expect(run).not.toHaveProperty('turnQueue');
    expect(run).not.toHaveProperty('movementClock');
    expect(run).not.toHaveProperty('transition');
    expect(run).not.toHaveProperty('renderAlpha');
  });

  it('steers within a cell without advancing strategic occupancy', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    const before = run.snake.segments.map((segment) => ({ id: segment.id, cell: { ...segment.cell } }));

    stepRun(run, { yaw: 1, pitch: 0 }, 1 / 60, stableRng);

    expect(run.flight.orientation.yaw).toBeGreaterThan(0);
    expect(run.flight.unwrappedPosition.x).toBeGreaterThan(4.5);
    expect(run.snake.segments).toEqual(before);
  });

  it('commits exactly when the continuous head enters the next cell', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };

    for (let tick = 0; tick < 4; tick += 1) stepRun(run, neutral, 1 / 60, stableRng);
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 4, z: 4 });

    stepRun(run, neutral, 1 / 60, stableRng);
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 4, z: 5 });
  });

  it('collects exact-cell food on entry and retains +2 growth for later entries', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 4, y: 4, z: 5 };

    stepRun(run, neutral, 1 / 12, stableRng);
    expect(run.foodsCollected).toBe(1);
    expect(run.score).toBe(1);
    expect(run.snake.pendingGrowth).toBe(2);
    expect(run.snake.segments).toHaveLength(6);

    run.food = { x: 0, y: 0, z: 0 };
    stepRun(run, neutral, 1 / 6, stableRng);
    stepRun(run, neutral, 1 / 6, stableRng);
    expect(run.snake.pendingGrowth).toBe(0);
    expect(run.snake.segments).toHaveLength(8);
    expect(run.maxLength).toBe(8);
  });

  it('detects exact collision before committing the occupied candidate cell', () => {
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
    run.flight = createInitialFlightPose({ x: 4, y: 4, z: 4 }, run.config);
    run.previousFlight = run.flight;
    const before = run.snake.segments.map((segment) => ({ id: segment.id, cell: { ...segment.cell } }));

    stepRun(run, neutral, 1 / 12, stableRng);
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

  it('stops processing later entries immediately after the first collision', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    run.snake.segments = [
      { id: 0, cell: { x: 4, y: 4, z: 4 } },
      { id: 1, cell: { x: 4, y: 4, z: 3 } },
      { id: 2, cell: { x: 4, y: 4, z: 6 } },
      { id: 3, cell: { x: 3, y: 4, z: 6 } },
      { id: 4, cell: { x: 3, y: 4, z: 5 } },
      { id: 5, cell: { x: 3, y: 4, z: 4 } }
    ];

    processGridEntries(run, [
      { cell: { x: 4, y: 4, z: 5 }, tEnter: 0.25 },
      { cell: { x: 4, y: 4, z: 6 }, tEnter: 0.75 },
      { cell: { x: 4, y: 4, z: 7 }, tEnter: 1 }
    ], stableRng);

    expect(run.phase).toBe('game-over');
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 4, z: 5 });
    expect(run.snake.segments.some((segment) => segment.cell.z === 7 && segment.cell.x === 4)).toBe(false);
  });

  it('preserves the 300-food completion contract with the V2.1 ruleset', () => {
    const run = startRun(createRun(stableRng));
    run.foodsCollected = COMPLETION_FOOD_TARGET - 1;
    run.score = COMPLETION_FOOD_TARGET - 1;
    run.food = { x: 4, y: 4, z: 5 };

    stepRun(run, neutral, 1 / 12, stableRng);
    expect(run.phase).toBe('completed');
    expect(run.score).toBe(COMPLETION_FOOD_TARGET);
    expect(run.result).toMatchObject({
      rulesetId: 'pixel-flight-grid-v2-1',
      score: COMPLETION_FOOD_TARGET,
      foodsCollected: COMPLETION_FOOD_TARGET
    });
  });
});
