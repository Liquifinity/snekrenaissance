import { describe, expect, it } from 'vitest';
import { cellToWorld } from '../../src/game/grid-topology';
import { createRun, startRun, stepRun } from '../../src/game/run-state';
import { snakeHead } from '../../src/game/snake';
import { FOOD_VOXEL_SIZE } from '../../src/render/food-renderer';
import { buildPixelSnakeRenderSnapshot } from '../../src/render/pixel-snake-presentation';
import { CUBE_GRID_DIVISIONS } from '../../src/render/scene';
import { SNAKE_VOXEL_SIZE } from '../../src/render/snake-renderer';

const stableRng = () => 0.75;

describe('SNEK CORE V4 one-lattice presentation contract', () => {
  it('maps an equal head/food GridCell to an identical world center', () => {
    const run = createRun(stableRng);
    const cell = snakeHead(run.snake).cell;
    expect(cellToWorld(cell, run.config)).toEqual(cellToWorld({ ...cell }, run.config));
  });

  it('renders every strategic segment at the exact cellToWorld center used by food', () => {
    const run = createRun(stableRng);
    const snapshot = buildPixelSnakeRenderSnapshot(run);
    expect(snapshot.headPosition).toEqual(cellToWorld(run.snake.segments[0].cell, run.config));
    snapshot.body.forEach((sample, index) => {
      expect(sample.id).toBe(run.snake.segments[index + 1].id);
      expect(sample.position).toEqual(cellToWorld(run.snake.segments[index + 1].cell, run.config));
    });
  });

  it('collects food only after the committed head reaches the exact consumed world center', () => {
    const run = startRun(createRun(stableRng));
    const consumedCell = { x: 4, y: 4, z: 5 } as const;
    const consumedWorld = cellToWorld(consumedCell, run.config);
    run.food = consumedCell;
    stepRun(run, stableRng);
    expect(run.foodsCollected).toBe(1);
    expect(snakeHead(run.snake).cell).toEqual(consumedCell);
    expect(cellToWorld(snakeHead(run.snake).cell, run.config)).toEqual(consumedWorld);
  });

  it('keeps growth, food voxel footprint and visible grid divisions registered to one lattice', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 4, y: 4, z: 5 };
    stepRun(run, stableRng);
    run.food = { x: 0, y: 0, z: 0 };
    stepRun(run, stableRng);
    stepRun(run, stableRng);
    const snapshot = buildPixelSnakeRenderSnapshot(run);
    expect(snapshot.body).toHaveLength(run.snake.segments.length - 1);
    expect(FOOD_VOXEL_SIZE).toBe(SNAKE_VOXEL_SIZE);
    expect(CUBE_GRID_DIVISIONS).toBe(run.config.resolution);
    snapshot.body.forEach((sample, index) => {
      expect(sample.position).toEqual(cellToWorld(run.snake.segments[index + 1].cell, run.config));
    });
  });
});
