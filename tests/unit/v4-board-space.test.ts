import { describe, expect, it } from 'vitest';
import type { GridDirection } from '../../src/game/grid-types';
import * as runStateModule from '../../src/game/run-state';
import { snakeHead } from '../../src/game/snake';

const stableRng = () => 0.75;
const DIRECTIONS: readonly GridDirection[] = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];
const EXPECTED_FROM_CENTER: Readonly<Record<GridDirection, Readonly<{ x: number; y: number; z: number }>>> = {
  '+X': { x: 5, y: 4, z: 4 },
  '-X': { x: 3, y: 4, z: 4 },
  '+Y': { x: 4, y: 5, z: 4 },
  '-Y': { x: 4, y: 3, z: 4 },
  '+Z': { x: 4, y: 4, z: 5 },
  '-Z': { x: 4, y: 4, z: 3 }
};

type V4Run = ReturnType<typeof runStateModule.createRun> & {
  heading?: GridDirection;
  pendingDirection?: GridDirection | null;
};

type QueueDirection = (state: V4Run, direction: GridDirection) => V4Run;

function queueDirection(): QueueDirection | undefined {
  return (runStateModule as unknown as { queueDirection?: QueueDirection }).queueDirection;
}

function playingRun(): V4Run {
  return runStateModule.startRun(runStateModule.createRun(stableRng)) as V4Run;
}

describe('SNEK CORE V4 board-space strategic authority', () => {
  it('starts with +Z heading and no pending world direction', () => {
    const run = runStateModule.createRun(stableRng) as V4Run;
    expect(run.heading).toBe('+Z');
    expect(run.pendingDirection).toBeNull();
  });

  it.each(DIRECTIONS)('moves exactly one face-adjacent cell for absolute %s', (direction) => {
    const enqueue = queueDirection();
    expect(typeof enqueue).toBe('function');
    if (!enqueue) return;

    const run = playingRun();
    run.snake.segments[0] = { id: run.snake.segments[0].id, cell: { x: 4, y: 4, z: 4 } };
    run.heading = direction === '-Z' ? '+X' : '+Z';
    run.pendingDirection = null;
    enqueue(run, direction);
    runStateModule.stepRun(run, stableRng);

    expect(snakeHead(run.snake).cell).toEqual(EXPECTED_FROM_CENTER[direction]);
    expect(run.heading).toBe(direction);
    expect(run.pendingDirection).toBeNull();
  });

  it('rejects only the direct opposite of the committed heading', () => {
    const enqueue = queueDirection();
    expect(typeof enqueue).toBe('function');
    if (!enqueue) return;

    const run = playingRun();
    run.heading = '+X';
    run.pendingDirection = null;
    enqueue(run, '-X');
    expect(run.pendingDirection).toBeNull();

    enqueue(run, '+Y');
    expect(run.pendingDirection).toBe('+Y');
  });

  it('accepts repeated current heading as continue straight', () => {
    const enqueue = queueDirection();
    expect(typeof enqueue).toBe('function');
    if (!enqueue) return;

    const run = playingRun();
    run.heading = '+Z';
    run.pendingDirection = null;
    enqueue(run, '+Z');
    expect(run.pendingDirection).toBe('+Z');
  });

  it('keeps the newest valid pre-step direction', () => {
    const enqueue = queueDirection();
    expect(typeof enqueue).toBe('function');
    if (!enqueue) return;

    const run = playingRun();
    run.heading = '+Z';
    run.pendingDirection = null;
    enqueue(run, '+X');
    enqueue(run, '+Y');
    enqueue(run, '-X');
    expect(run.pendingDirection).toBe('-X');
  });

  it('does not erase an already-valid pending command when a later opposite command is invalid', () => {
    const enqueue = queueDirection();
    expect(typeof enqueue).toBe('function');
    if (!enqueue) return;

    const run = playingRun();
    run.heading = '+Z';
    run.pendingDirection = null;
    enqueue(run, '+X');
    enqueue(run, '-Z');
    expect(run.pendingDirection).toBe('+X');
  });
});
