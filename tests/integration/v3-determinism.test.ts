import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../../src/game/grid-config';
import { INITIAL_GRID_FRAME } from '../../src/game/grid-frame';
import { startRun, createRun, stepRun } from '../../src/game/run-state';
import { snakeHead } from '../../src/game/snake';
import type { GridCell } from '../../src/game/grid-types';

const stableRng = () => 0.375;
const STEPS = 1_000;

function cloneCell(cell: GridCell): GridCell {
  return { x: cell.x, y: cell.y, z: cell.z };
}

function toroidalAxisDistance(a: number, b: number): number {
  const direct = Math.abs(a - b);
  return Math.min(direct, GRID_CONFIG.resolution - direct);
}

function expectFaceAdjacent(from: GridCell, to: GridCell): void {
  const distances = [
    toroidalAxisDistance(from.x, to.x),
    toroidalAxisDistance(from.y, to.y),
    toroidalAxisDistance(from.z, to.z)
  ];
  expect(distances.filter((distance) => distance === 1)).toHaveLength(1);
  expect(distances.filter((distance) => distance !== 0)).toHaveLength(1);
}

function deterministicRun() {
  const run = startRun(createRun(stableRng));

  // A six-cell straight body on the 9-cell +Z toroidal ring can circulate
  // indefinitely without eating or self-colliding. This isolates movement
  // determinism from food RNG and terminal-state behavior.
  run.snake.segments = [
    { id: 0, cell: { x: 4, y: 4, z: 4 } },
    { id: 1, cell: { x: 4, y: 4, z: 3 } },
    { id: 2, cell: { x: 4, y: 4, z: 2 } },
    { id: 3, cell: { x: 4, y: 4, z: 1 } },
    { id: 4, cell: { x: 4, y: 4, z: 0 } },
    { id: 5, cell: { x: 4, y: 4, z: 8 } }
  ];
  run.snake.pendingGrowth = 0;
  run.snake.nextSegmentId = 6;
  run.frame = INITIAL_GRID_FRAME;
  run.pendingTurn = 'none';
  run.food = { x: 0, y: 0, z: 0 };
  run.foodsCollected = 0;
  run.score = 0;
  run.foodEaten = 0;
  run.maxLength = 6;
  run.elapsedMs = 0;
  run.result = null;

  const snapshots = [];

  for (let step = 0; step < STEPS; step += 1) {
    const previousHead = cloneCell(snakeHead(run.snake).cell);
    stepRun(run, stableRng);
    const nextHead = cloneCell(snakeHead(run.snake).cell);

    expect(run.phase).toBe('playing');
    expectFaceAdjacent(previousHead, nextHead);

    snapshots.push({
      frame: { ...run.frame },
      head: nextHead,
      body: run.snake.segments.map((segment) => ({
        id: segment.id,
        cell: cloneCell(segment.cell)
      })),
      food: run.food ? cloneCell(run.food) : null,
      score: run.score,
      foodsCollected: run.foodsCollected,
      elapsedMs: run.elapsedMs,
      phase: run.phase
    });
  }

  return snapshots;
}

describe('SNEK CORE V3 deterministic strategic runtime', () => {
  it('replays at least 1,000 strategic steps identically with face-adjacent commits only', () => {
    const first = deterministicRun();
    const second = deterministicRun();

    expect(first).toHaveLength(STEPS);
    expect(second).toEqual(first);
    expect(first.at(-1)).toMatchObject({
      frame: INITIAL_GRID_FRAME,
      food: { x: 0, y: 0, z: 0 },
      score: 0,
      foodsCollected: 0,
      phase: 'playing'
    });
  });
});
