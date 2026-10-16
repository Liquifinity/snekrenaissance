import { describe, expect, it } from 'vitest';
import { GROWTH_PER_FOOD, INITIAL_BODY_SEGMENTS, WORLD_SIZE } from '../../src/game/constants';
import {
  createRun,
  startRun,
  stepRun,
  type RunState
} from '../../src/game/run-state';
import { TrailBuffer } from '../../src/game/trail';

const neutral = { yaw: 0, pitch: 0 };
const stableRng = () => 0.75;

function collisionTrail(): TrailBuffer {
  const trail = new TrailBuffer({ x: 0, y: 0, z: 0.04 });
  trail.push({ x: 0.28, y: 0, z: 0.04 });
  trail.push({ x: 0.28, y: 0, z: 0.28 });
  trail.push({ x: 0, y: 0, z: 0.28 });
  trail.push({ x: 0, y: 0, z: 0 });
  return trail;
}

function armSelfCollision(state: RunState): RunState {
  state.headUnwrapped = { x: 0, y: 0, z: 0 };
  state.headWrapped = { x: 0, y: 0, z: 0 };
  state.trail = collisionTrail();
  state.food = { x: 3, y: 3, z: 3 };
  return state;
}

describe('run state machine', () => {
  it('creates a ready run with 12 body segments and one food', () => {
    const run = createRun(stableRng);
    expect(run.phase).toBe('ready');
    expect(run.snake.segmentCount).toBe(INITIAL_BODY_SEGMENTS);
    expect(run.food).not.toBeNull();
    expect(run.foodEaten).toBe(0);
  });

  it('collecting one food grows exactly four segments', () => {
    let run = startRun(createRun(stableRng));
    run.food = { ...run.headWrapped };

    run = stepRun(run, neutral, 0, stableRng);

    expect(run.foodEaten).toBe(1);
    expect(run.snake.segmentCount).toBe(INITIAL_BODY_SEGMENTS + GROWTH_PER_FOOD);
    expect(run.maxLength).toBe(INITIAL_BODY_SEGMENTS + GROWTH_PER_FOOD);
  });

  it('crossing a wall wraps but never causes game over', () => {
    let run = startRun(createRun(stableRng));
    const half = WORLD_SIZE / 2;
    run.headUnwrapped = { x: 0, y: 0, z: half - 0.05 };
    run.headWrapped = { x: 0, y: 0, z: half - 0.05 };

    run = stepRun(run, neutral, 0.1, stableRng);

    expect(run.phase).toBe('playing');
    expect(run.headUnwrapped.z).toBeGreaterThan(half);
    expect(run.headWrapped.z).toBeLessThan(-half + 1);
  });

  it('the 300th food completes the run instead of showing game over', () => {
    let run = startRun(createRun(stableRng));
    run.foodEaten = 299;
    run.food = { ...run.headWrapped };

    run = stepRun(run, neutral, 0, stableRng);

    expect(run.foodEaten).toBe(300);
    expect(run.phase).toBe('completed');
    expect(run.result?.foodEaten).toBe(300);
  });

  it('self-collision transitions to game-over exactly once', () => {
    let run = armSelfCollision(startRun(createRun(stableRng)));
    run = stepRun(run, neutral, 0.01, stableRng);

    expect(run.phase).toBe('game-over');
    expect(run.result).not.toBeNull();
    const result = run.result;

    const after = stepRun(run, neutral, 1, stableRng);
    expect(after).toBe(run);
    expect(after.result).toBe(result);
  });

  it('final result records maximum length and elapsed duration', () => {
    let run = armSelfCollision(startRun(createRun(stableRng)));
    run.elapsedMs = 500;
    run = stepRun(run, neutral, 0.01, stableRng);

    expect(run.result).toEqual({
      maxLength: INITIAL_BODY_SEGMENTS,
      foodEaten: 0,
      durationMs: 510
    });
  });
});
