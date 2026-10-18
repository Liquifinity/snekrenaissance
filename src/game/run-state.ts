import { wouldSelfCollide } from './collision';
import { isGridFoodCollected, spawnGridFood } from './food';
import { GRID_CONFIG, RULESET_ID, type GridConfig } from './grid-config';
import { INITIAL_GRID_FRAME } from './grid-frame';
import { advanceGridMovement } from './grid-movement';
import type { GridCell, GridFrame, TurnIntent } from './grid-types';
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
  frame: GridFrame;
  pendingTurn: TurnIntent;
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
    frame: INITIAL_GRID_FRAME,
    pendingTurn: 'none',
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

export function queueTurn(
  state: RunState,
  intent: Exclude<TurnIntent, 'none'>
): RunState {
  state.pendingTurn = intent;
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

  const intent = state.pendingTurn;
  state.pendingTurn = 'none';
  const movement = advanceGridMovement(
    snakeHead(state.snake).cell,
    state.frame,
    intent,
    config
  );

  if (wouldSelfCollide(state.snake, movement.cell, state.config)) {
    state.phase = 'game-over';
    state.result = buildResult(state);
    return state;
  }

  commitSnakeStep(state.snake, movement.cell);
  state.frame = movement.frame;
  state.maxLength = Math.max(state.maxLength, state.snake.segments.length);

  if (state.food && isGridFoodCollected(movement.cell, state.food)) {
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
