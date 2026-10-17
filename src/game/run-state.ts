import { wouldSelfCollide } from './collision';
import { isGridFoodCollected, spawnGridFood } from './food';
import { GRID_CONFIG, RULESET_ID, type GridConfig } from './grid-config';
import { INITIAL_GRID_FRAME } from './grid-frame';
import { GridMovementClock, TurnIntentQueue, advanceGridMovement } from './grid-movement';
import type { GridCell, GridFrame, TurnIntent } from './grid-types';
import {
  createLogicalSnapshot,
  createLogicalTransition,
  type LogicalTransition
} from './logical-transition';
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
  /** Preserved legacy HTTP payload alias; V2 score authority is foodsCollected. */
  foodEaten: number;
}>;

export type RunState = {
  phase: RunPhase;
  config: GridConfig;
  snake: GridSnakeState;
  frame: GridFrame;
  food: GridCell | null;
  foodsCollected: number;
  score: number;
  /** Preserved UI/backend compatibility alias; gameplay authority is foodsCollected. */
  foodEaten: number;
  maxLength: number;
  elapsedMs: number;
  result: RunResult | null;
  turnQueue: TurnIntentQueue;
  movementClock: GridMovementClock;
  transition: LogicalTransition | null;
  renderAlpha: number;
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
    food: spawn.ok ? spawn.cell : null,
    foodsCollected: 0,
    score: 0,
    foodEaten: 0,
    maxLength: snake.segments.length,
    elapsedMs: 0,
    result: null,
    turnQueue: new TurnIntentQueue(),
    movementClock: new GridMovementClock(config.stepsPerSecond),
    transition: null,
    renderAlpha: 0
  };
}

export function startRun(state: RunState): RunState {
  if (state.phase !== 'ready') return state;
  state.phase = 'playing';
  return state;
}

export function queueTurnIntent(state: RunState, intent: TurnIntent): boolean {
  if (intent === 'none') return false;
  return state.turnQueue.enqueue(intent);
}

function commitCellStep(state: RunState, rng: () => number): void {
  if (state.phase !== 'playing') return;

  const previousFrame = state.frame;
  const previousSnapshot = createLogicalSnapshot(state.snake.segments, previousFrame);
  const intent = state.turnQueue.shift();
  const movement = advanceGridMovement(
    snakeHead(state.snake).cell,
    previousFrame,
    intent,
    state.config
  );

  if (wouldSelfCollide(state.snake, movement.cell, state.config)) {
    state.phase = 'game-over';
    state.transition = null;
    state.result = buildResult(state);
    return;
  }

  const committed = commitSnakeStep(state.snake, movement.cell);
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
    } else {
      respawnGridFood(state, rng);
    }
  } else if (!state.food) {
    respawnGridFood(state, rng);
  }

  const currentSnapshot = createLogicalSnapshot(state.snake.segments, state.frame);
  state.transition = createLogicalTransition(
    previousSnapshot,
    currentSnapshot,
    movement.step,
    committed.bornSegmentId
  );

  if (state.phase === 'completed') {
    state.result = buildResult(state);
  }
}

export function stepRun(
  state: RunState,
  dtSeconds: number,
  rng: () => number = Math.random,
  config: GridConfig = state.config
): RunState {
  if (state.phase !== 'playing') return state;

  if (!Number.isFinite(dtSeconds) || dtSeconds < 0) {
    throw new RangeError('Run dt must be a finite non-negative number.');
  }

  if (config !== state.config) {
    throw new RangeError('RunState config cannot change after creation.');
  }

  state.elapsedMs += dtSeconds * 1000;
  state.movementClock.consume(dtSeconds, () => commitCellStep(state, rng));
  state.renderAlpha = state.movementClock.alpha;
  return state;
}
