import { wouldSelfCollide } from './collision';
import { GRID_CONFIG, type GridConfig } from './grid-config';
import { rotateGridFrame } from './grid-frame';
import { advanceGridStep, cellKey } from './grid-topology';
import type { GridDirection, GridFrame, TurnIntent } from './grid-types';
import { snakeHead, type GridSnakeState } from './snake';

export type RunMetrics = Readonly<{
  occupancyRatio: number;
  safeMoveCount: number;
  nearBodyEncounters: number;
  firstPressureMs: number | null;
  firstConfinementMs: number | null;
}>;

const LOCAL_ACTIONS: readonly TurnIntent[] = Object.freeze([
  'none',
  'left',
  'right',
  'up',
  'down'
]);

const CARDINAL_DIRECTIONS: readonly GridDirection[] = Object.freeze([
  '+X', '-X', '+Y', '-Y', '+Z', '-Z'
]);

export function occupancyRatio(
  state: GridSnakeState,
  config: GridConfig = GRID_CONFIG
): number {
  return state.segments.length / config.totalCells;
}

export function safeMoveCount(
  state: GridSnakeState,
  frame: GridFrame,
  config: GridConfig = GRID_CONFIG
): number {
  const head = snakeHead(state).cell;
  const uniqueTargets = new Set<number>();
  let safe = 0;

  for (const intent of LOCAL_ACTIONS) {
    const nextFrame = rotateGridFrame(frame, intent);
    const target = advanceGridStep(head, nextFrame.forward, config).to;
    const key = cellKey(target, config);
    if (uniqueTargets.has(key)) continue;
    uniqueTargets.add(key);
    if (!wouldSelfCollide(state, target, config)) safe += 1;
  }

  return safe;
}

export function hasNearBodyEncounter(
  state: GridSnakeState,
  config: GridConfig = GRID_CONFIG
): boolean {
  if (state.segments.length <= 2) return false;

  const head = snakeHead(state).cell;
  const dangerousBody = new Set(
    state.segments.slice(2).map((segment) => cellKey(segment.cell, config))
  );

  for (const direction of CARDINAL_DIRECTIONS) {
    const adjacent = advanceGridStep(head, direction, config).to;
    if (dangerousBody.has(cellKey(adjacent, config))) return true;
  }

  return false;
}

export class GridMetricsTracker {
  private occupancy = 0;
  private safeMoves = 0;
  private nearBody = 0;
  private firstPressure: number | null = null;
  private firstConfinement: number | null = null;

  observe(
    state: GridSnakeState,
    frame: GridFrame,
    elapsedMs: number,
    config: GridConfig = GRID_CONFIG
  ): void {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
      throw new RangeError('Metric elapsedMs must be a finite non-negative number');
    }

    this.occupancy = occupancyRatio(state, config);
    this.safeMoves = safeMoveCount(state, frame, config);

    if (hasNearBodyEncounter(state, config)) this.nearBody += 1;
    if (this.safeMoves <= 2 && this.firstPressure === null) this.firstPressure = elapsedMs;
    if (this.safeMoves <= 1 && this.firstConfinement === null) this.firstConfinement = elapsedMs;
  }

  snapshot(): RunMetrics {
    return Object.freeze({
      occupancyRatio: this.occupancy,
      safeMoveCount: this.safeMoves,
      nearBodyEncounters: this.nearBody,
      firstPressureMs: this.firstPressure,
      firstConfinementMs: this.firstConfinement
    });
  }
}
