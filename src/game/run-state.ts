import {
  GROWTH_PER_FOOD,
  INITIAL_BODY_SEGMENTS,
  SEGMENT_SPACING,
  TRAIL_RESERVE_SEGMENTS,
  WORLD_SIZE
} from './constants';
import { isSelfCollision } from './collision';
import { isFoodCollected, spawnFood } from './food';
import { advanceHead } from './simulation';
import {
  applySteering,
  createInitialOrientation,
  type OrientationState,
  type SteeringInput
} from './steering';
import {
  createSnakeState,
  growSnake,
  sampleBodyPositions,
  type SnakeState
} from './snake';
import { TrailBuffer } from './trail';
import type { Vec3 } from './types';

export type RunPhase = 'ready' | 'playing' | 'game-over';

export type RunResult = {
  maxLength: number;
  foodEaten: number;
  durationMs: number;
};

export type RunState = {
  phase: RunPhase;
  snake: SnakeState;
  orientation: OrientationState;
  headUnwrapped: Vec3;
  headWrapped: Vec3;
  forward: Vec3;
  wrapOffset: Vec3;
  trail: TrailBuffer;
  bodyPositions: Vec3[];
  food: Vec3 | null;
  foodEaten: number;
  maxLength: number;
  elapsedMs: number;
  result: RunResult | null;
};

function retainedTrailDistance(snake: SnakeState): number {
  return (snake.segmentCount + TRAIL_RESERVE_SEGMENTS) * snake.segmentSpacing;
}

function createInitialTrail(snake: SnakeState): TrailBuffer {
  const initialHistorySegments = snake.segmentCount + TRAIL_RESERVE_SEGMENTS + 2;
  const oldestDistance = initialHistorySegments * snake.segmentSpacing;
  const trail = new TrailBuffer({ x: 0, y: 0, z: -oldestDistance });

  for (let index = initialHistorySegments - 1; index >= 0; index -= 1) {
    trail.push({ x: 0, y: 0, z: -index * snake.segmentSpacing });
  }

  return trail;
}

export function createRun(rng: () => number = Math.random): RunState {
  const snake = createSnakeState(INITIAL_BODY_SEGMENTS, SEGMENT_SPACING);
  const trail = createInitialTrail(snake);
  const bodyPositions = sampleBodyPositions(snake, trail);
  const headUnwrapped = { x: 0, y: 0, z: 0 };
  const headWrapped = { ...headUnwrapped };
  const orientation = createInitialOrientation();
  const foodSpawn = spawnFood({
    head: headWrapped,
    body: bodyPositions,
    rng,
    worldSize: WORLD_SIZE
  });

  return {
    phase: 'ready',
    snake,
    orientation,
    headUnwrapped,
    headWrapped,
    forward: { x: 0, y: 0, z: 1 },
    wrapOffset: { x: 0, y: 0, z: 0 },
    trail,
    bodyPositions,
    food: foodSpawn.ok ? foodSpawn.position : null,
    foodEaten: 0,
    maxLength: snake.segmentCount,
    elapsedMs: 0,
    result: null
  };
}

export function startRun(state: RunState): RunState {
  if (state.phase !== 'ready') {
    return state;
  }

  state.phase = 'playing';
  return state;
}

function respawnFood(state: RunState, rng: () => number): void {
  const spawn = spawnFood({
    head: state.headWrapped,
    body: state.bodyPositions,
    rng,
    worldSize: WORLD_SIZE
  });
  state.food = spawn.ok ? spawn.position : null;
}

export function stepRun(
  state: RunState,
  input: SteeringInput,
  dtSeconds: number,
  rng: () => number = Math.random
): RunState {
  if (state.phase !== 'playing') {
    return state;
  }

  state.elapsedMs += dtSeconds * 1000;
  state.orientation = applySteering(state.orientation, input, dtSeconds);

  const motion = advanceHead(
    state.headUnwrapped,
    state.orientation,
    dtSeconds
  );

  state.headUnwrapped = motion.unwrappedPosition;
  state.headWrapped = motion.wrappedPosition;
  state.forward = motion.forward;
  state.wrapOffset = motion.wrapOffset;
  state.trail.push(state.headUnwrapped);
  state.trail.trimToDistance(retainedTrailDistance(state.snake));
  state.bodyPositions = sampleBodyPositions(state.snake, state.trail);

  if (state.food && isFoodCollected(state.headWrapped, state.food)) {
    state.foodEaten += 1;
    state.snake = growSnake(state.snake, GROWTH_PER_FOOD);
    state.maxLength = Math.max(state.maxLength, state.snake.segmentCount);
    state.bodyPositions = sampleBodyPositions(state.snake, state.trail);
    respawnFood(state, rng);
  } else if (!state.food) {
    respawnFood(state, rng);
  }

  if (isSelfCollision(state.headWrapped, state.bodyPositions)) {
    state.phase = 'game-over';
    state.result = {
      maxLength: state.maxLength,
      foodEaten: state.foodEaten,
      durationMs: Math.round(state.elapsedMs)
    };
  }

  return state;
}
