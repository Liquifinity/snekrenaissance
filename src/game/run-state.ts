import { wouldSelfCollide } from './collision';
import { isGridFoodCollected, spawnGridFood } from './food';
import { GRID_CONFIG, RULESET_ID, type GridConfig } from './grid-config';
import { INITIAL_GRID_FRAME } from './grid-frame';
import { GridMovementClock, TurnIntentQueue, advanceGridMovement } from './grid-movement';
import { cellToWorld, directionVector } from './grid-topology';
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
import type { Vec3 } from './types';

export type RunPhase = 'ready' | 'playing' | 'game-over' | 'completed';

export type RunResult = Readonly<{
  rulesetId: typeof RULESET_ID;
  score: number;
  foodsCollected: number;
  length: number;
  maxLength: number;
  durationMs: number;
  /** Temporary V1 gateway/UI alias. Removed when Task 11 isolates V2 score. */
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
  /** Temporary V1 UI/progress alias. Gameplay authority is foodsCollected. */
  foodEaten: number;
  maxLength: number;
  elapsedMs: number;
  result: RunResult | null;
  turnQueue: TurnIntentQueue;
  movementClock: GridMovementClock;
  transition: LogicalTransition | null;
  renderAlpha: number;

  /** Temporary presentation bridge until Tasks 6/10 replace the V1 renderer path. */
  headUnwrapped: Vec3;
  headWrapped: Vec3;
  forward: Vec3;
  wrapOffset: Vec3;
  bodyPositions: Vec3[];
};

type LegacySteeringInput = Readonly<{ yaw: number; pitch: number }>;

function cloneVec3(value: Vec3): Vec3 {
  return { x: value.x, y: value.y, z: value.z };
}

function presentationForward(frame: GridFrame): Vec3 {
  const vector = directionVector(frame.forward);
  return { x: vector.x, y: vector.y, z: vector.z };
}

function syncPresentationBridge(state: RunState): void {
  const headWorld = cellToWorld(snakeHead(state.snake).cell, state.config);
  state.headWrapped = headWorld;
  state.headUnwrapped = {
    x: headWorld.x - state.wrapOffset.x,
    y: headWorld.y - state.wrapOffset.y,
    z: headWorld.z - state.wrapOffset.z
  };
  state.forward = presentationForward(state.frame);
  state.bodyPositions = state.snake.segments
    .slice(1)
    .map((segment) => cellToWorld(segment.cell, state.config));
}

function applyWrapOffset(state: RunState, transition: LogicalTransition): void {
  const axis = transition.headStep.wrappedAxis;
  if (!axis) return;
  const offsetDelta = -transition.headStep.wrapSign * state.config.worldSize;
  state.wrapOffset = {
    ...state.wrapOffset,
    [axis]: state.wrapOffset[axis] + offsetDelta
  };
}

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
  const headWrapped = cellToWorld(snakeHead(snake).cell, config);

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
    renderAlpha: 0,
    headUnwrapped: cloneVec3(headWrapped),
    headWrapped: cloneVec3(headWrapped),
    forward: presentationForward(INITIAL_GRID_FRAME),
    wrapOffset: { x: 0, y: 0, z: 0 },
    bodyPositions: snake.segments.slice(1).map((segment) => cellToWorld(segment.cell, config))
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
  applyWrapOffset(state, state.transition);
  syncPresentationBridge(state);

  if (state.phase === 'completed') {
    state.result = buildResult(state);
  }
}

function isGridConfig(value: unknown): value is GridConfig {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GridConfig>;
  return typeof candidate.resolution === 'number'
    && typeof candidate.cellSize === 'number'
    && typeof candidate.stepsPerSecond === 'number'
    && typeof candidate.worldSize === 'number'
    && typeof candidate.totalCells === 'number';
}

export function stepRun(
  state: RunState,
  dtSeconds: number,
  rng?: () => number,
  config?: GridConfig
): RunState;
/** Temporary call-shape bridge for main.ts until Task 10 drains discrete intents directly. */
export function stepRun(
  state: RunState,
  legacyInput: LegacySteeringInput,
  dtSeconds: number,
  rng?: () => number
): RunState;
export function stepRun(
  state: RunState,
  dtOrLegacyInput: number | LegacySteeringInput,
  rngOrDt: (() => number) | number = Math.random,
  configOrRng: GridConfig | (() => number) = state.config
): RunState {
  if (state.phase !== 'playing') return state;

  let dtSeconds: number;
  let rng: () => number;
  let config = state.config;

  if (typeof dtOrLegacyInput === 'number') {
    dtSeconds = dtOrLegacyInput;
    rng = typeof rngOrDt === 'function' ? rngOrDt : Math.random;
    if (isGridConfig(configOrRng)) config = configOrRng;
  } else {
    dtSeconds = typeof rngOrDt === 'number' ? rngOrDt : 0;
    rng = typeof configOrRng === 'function' ? configOrRng : Math.random;
  }

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
