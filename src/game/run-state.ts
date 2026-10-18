import { wouldSelfCollide } from './collision';
import { isGridFoodCollected, spawnGridFood } from './food';
import { GRID_CONFIG, RULESET_ID, type GridConfig } from './grid-config';
import { isOppositeGridDirection } from './grid-direction';
import { advanceGridStep } from './grid-topology';
import type { GridCell, GridDirection } from './grid-types';
import { COMPLETION_FOOD_TARGET } from './progress';
import {
  addGrowth,
  commitSnakeStep,
  createGridSnake,
  snakeHead,
  type GridSnakeState
} from './snake';

export type RunPhase = 'ready' | 'playing' | 'game-over' | 'completed';

export type RunResult = Readonly<{
  rulesetId: typeof RULESET_ID;
  score: number;
  foodsCollected: number;
  length: number;
  maxLength: number;
  durationMs: number;
  /** Preserved legacy HTTP payload alias; score authority is foodsCollected. */
  foodEaten: number;
}>;

export type RunState = {
  phase: RunPhase;
  config: GridConfig;
  snake: GridSnakeState;
  heading: GridDirection;
  pendingDirection: GridDirection | null;
  food: GridCell | null;
  foodsCollected: number;
  score: number;
  /** Preserved UI/backend compatibility alias; gameplay authority is foodsCollected. */
  foodEaten: number;
  maxLength: number;
  elapsedMs: number;
  result: RunResult | null;
};

function buildResult(state: RunState): RunResult {
  const length = state.snake.segments.length;
  return Object.freeze({
    rulesetId: RULESET_ID,
    score: state.score,
    foodsCollected: state.foodsCollected,
    length,
    maxLength: state.maxLength,
    durationMs: Math.round(state.elapsedMs),
    foodEaten: state.foodsCollected
  });
}

function respawnGridFood(state: RunState, rng: () => number): void {
  const spawn = spawnGridFood(state.snake, rng, state.config);
  state.food = spawn.ok ? spawn.cell : null;
}

export function createRun(
  rng: () => number = Math.random,
  config: GridConfig = GRID_CONFIG
): RunState {
  const snake = createGridSnake(config);
  const spawn = spawnGridFood(snake, rng, config);

  return {
    phase: 'ready',
    config,
    snake,
    heading: '+Z',
    pendingDirection: null,
    food: spawn.ok ? spawn.cell : null,
    foodsCollected: 0,
    score: 0,
    foodEaten: 0,
    maxLength: snake.segments.length,
    elapsedMs: 0,
    result: null
  };
}

export function startRun(state: RunState): RunState {
  if (state.phase !== 'ready') return state;
  state.phase = 'playing';
  return state;
}

export function queueDirection(
  state: RunState,
  direction: GridDirection
): RunState {
  if (isOppositeGridDirection(state.heading, direction)) return state;
  state.pendingDirection = direction;
  return state;
}

export function stepRun(
  state: RunState,
  rng: () => number = Math.random,
  config: GridConfig = state.config
): RunState {
  if (state.phase !== 'playing') return state;

  if (config !== state.config) {
    throw new RangeError('RunState config cannot change after creation.');
  }

  state.elapsedMs += 1000 / state.config.stepsPerSecond;

  const direction = state.pendingDirection ?? state.heading;
  state.pendingDirection = null;
  state.heading = direction;
  const movement = advanceGridStep(
    snakeHead(state.snake).cell,
    state.heading,
    config
  );

  if (wouldSelfCollide(state.snake, movement.to, state.config)) {
    state.phase = 'game-over';
    state.result = buildResult(state);
    return state;
  }

  commitSnakeStep(state.snake, movement.to);
  state.maxLength = Math.max(state.maxLength, state.snake.segments.length);

  if (state.food && isGridFoodCollected(movement.to, state.food)) {
    state.foodsCollected += 1;
    state.score = state.foodsCollected;
    state.foodEaten = state.foodsCollected;
    addGrowth(state.snake, state.config.growthPerFood);

    if (state.foodsCollected >= COMPLETION_FOOD_TARGET) {
      state.food = null;
      state.phase = 'completed';
      state.result = buildResult(state);
      return state;
    }

    respawnGridFood(state, rng);
  } else if (!state.food) {
    respawnGridFood(state, rng);
  }

  return state;
}
