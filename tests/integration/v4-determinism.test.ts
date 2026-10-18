import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../../src/game/grid-config';
import { createRun, queueDirection, startRun, stepRun } from '../../src/game/run-state';
import { FixedStepClock } from '../../src/game/simulation';
import { snakeHead } from '../../src/game/snake';
import type { GridCell } from '../../src/game/grid-types';

const stableRng = () => 0.375;
const STEPS = 1_000;

function cloneCell(cell: GridCell): GridCell { return { x: cell.x, y: cell.y, z: cell.z }; }
function toroidalAxisDistance(a: number, b: number): number { const direct = Math.abs(a - b); return Math.min(direct, GRID_CONFIG.resolution - direct); }
function expectFaceAdjacent(from: GridCell, to: GridCell): void {
  const distances = [toroidalAxisDistance(from.x, to.x), toroidalAxisDistance(from.y, to.y), toroidalAxisDistance(from.z, to.z)];
  expect(distances.filter((distance) => distance === 1)).toHaveLength(1);
  expect(distances.filter((distance) => distance !== 0)).toHaveLength(1);
}

function createStraightToroidalRun() {
  const run = startRun(createRun(stableRng));
  run.snake.segments = [
    { id: 0, cell: { x: 4, y: 4, z: 4 } }, { id: 1, cell: { x: 4, y: 4, z: 3 } },
    { id: 2, cell: { x: 4, y: 4, z: 2 } }, { id: 3, cell: { x: 4, y: 4, z: 1 } },
    { id: 4, cell: { x: 4, y: 4, z: 0 } }, { id: 5, cell: { x: 4, y: 4, z: 8 } }
  ];
  run.snake.pendingGrowth = 0;
  run.snake.nextSegmentId = 6;
  run.heading = '+Z';
  run.pendingDirection = null;
  run.food = { x: 0, y: 0, z: 0 };
  run.foodsCollected = 0; run.score = 0; run.foodEaten = 0; run.maxLength = 6; run.elapsedMs = 0; run.result = null;
  return run;
}

function deterministicRun() {
  const run = createStraightToroidalRun();
  const snapshots = [];
  for (let step = 0; step < STEPS; step += 1) {
    const previousHead = cloneCell(snakeHead(run.snake).cell);
    stepRun(run, stableRng);
    const nextHead = cloneCell(snakeHead(run.snake).cell);
    expect(run.phase).toBe('playing');
    expectFaceAdjacent(previousHead, nextHead);
    snapshots.push({
      heading: run.heading,
      head: nextHead,
      body: run.snake.segments.map((segment) => ({ id: segment.id, cell: cloneCell(segment.cell) })),
      food: run.food ? cloneCell(run.food) : null,
      score: run.score, foodsCollected: run.foodsCollected, elapsedMs: run.elapsedMs, phase: run.phase
    });
  }
  return snapshots;
}

function runFramePartition(frameDeltas: readonly number[]) {
  const run = createStraightToroidalRun();
  const clock = new FixedStepClock(1 / GRID_CONFIG.stepsPerSecond, 1, 20);
  const path: Array<{ head: GridCell; heading: typeof run.heading }> = [];
  let strategicStep = 0;
  for (const frameDelta of frameDeltas) {
    clock.consume(frameDelta, () => {
      if (strategicStep === 2) queueDirection(run, '-X');
      stepRun(run, stableRng);
      path.push({ head: cloneCell(snakeHead(run.snake).cell), heading: run.heading });
      strategicStep += 1;
    });
  }
  return path;
}

describe('SNEK CORE V4 deterministic strategic runtime', () => {
  it('replays at least 1,000 strategic steps identically with face-adjacent commits only', () => {
    const first = deterministicRun();
    const second = deterministicRun();
    expect(first).toHaveLength(STEPS);
    expect(second).toEqual(first);
    expect(first.at(-1)).toMatchObject({ heading: '+Z', food: { x: 0, y: 0, z: 0 }, score: 0, foodsCollected: 0, phase: 'playing' });
  });

  it('produces the same strategic path for equivalent 60 Hz, 30 Hz, and irregular render partitions', () => {
    const sixtyHz = runFramePartition(Array.from({ length: 120 }, () => 1 / 60));
    const thirtyHz = runFramePartition(Array.from({ length: 60 }, () => 1 / 30));
    const irregular = runFramePartition([0.05, 0.11, 0.07, 0.2, 0.03, 0.19, 0.17, 0.08, 0.25, 0.3, 0.15, 0.4]);
    expect(sixtyHz).toHaveLength(12);
    expect(thirtyHz).toEqual(sixtyHz);
    expect(irregular).toEqual(sixtyHz);
  });
});
