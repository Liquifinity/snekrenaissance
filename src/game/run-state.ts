import { wouldSelfCollide } from './collision';
import { isGridFoodCollected, spawnGridFood } from './food';
import {
  advanceFlightPose,
  createInitialFlightPose,
  type FlightPose,
  type SteeringInput
} from './flight';
import { GRID_CONFIG, RULESET_ID, type GridConfig } from './grid-config';
import { quantizeForwardToGridDirection } from './grid-direction';
import { traverseGridSegment, type GridCellEntry } from './grid-traversal';
import type { GridDirection } from './grid-types';
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
  /** Preserved legacy HTTP payload alias; V2.1 score authority is foodsCollected. */
  foodEaten: number;
}>;

export type RunState = {
  phase: RunPhase;
  config: GridConfig;
  snake: GridSnakeState;
  flight: FlightPose;
  previousFlight: FlightPose;
  visibleDirection: GridDirection;
  food: import('./grid-types').GridCell | null;
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
  const flight = createInitialFlightPose(snakeHead(snake).cell, config);

  return {
    phase: 'ready',
    config,
    snake,
    flight,
    previousFlight: flight,
    visibleDirection: '+Z',
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

export function processGridEntries(
  state: RunState,
  entries: readonly GridCellEntry[],
  visibleDirection: GridDirection,
  rng: () => number
): void {
  for (const entry of entries) {
    if (state.phase !== 'playing') return;

    if (wouldSelfCollide(state.snake, entry.cell, state.config)) {
      state.phase = 'game-over';
      state.result = buildResult(state);
      return;
    }

    commitSnakeStep(state.snake, entry.cell);
    state.visibleDirection = visibleDirection;
    state.maxLength = Math.max(state.maxLength, state.snake.segments.length);

    if (state.food && isGridFoodCollected(entry.cell, state.food)) {
      state.foodsCollected += 1;
      state.score = state.foodsCollected;
      state.foodEaten = state.foodsCollected;
      addGrowth(state.snake, state.config.growthPerFood);

      if (state.foodsCollected >= COMPLETION_FOOD_TARGET) {
        state.food = null;
        state.phase = 'completed';
        state.result = buildResult(state);
        return;
      }

      respawnGridFood(state, rng);
    } else if (!state.food) {
      respawnGridFood(state, rng);
    }
  }
}

export function stepRun(
  state: RunState,
  input: SteeringInput,
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
  const previousFlight = state.flight;
  const nextFlight = advanceFlightPose(previousFlight, input, dtSeconds, config);
  const entries = traverseGridSegment(
    previousFlight.unwrappedPosition,
    nextFlight.unwrappedPosition,
    config
  );
  const entryDirection = quantizeForwardToGridDirection(nextFlight.forward);

  state.previousFlight = previousFlight;
  processGridEntries(state, entries, entryDirection, rng);

  const resultingPhase = state.phase as RunPhase;
  if (resultingPhase !== 'game-over') {
    state.flight = nextFlight;
  }

  return state;
}
