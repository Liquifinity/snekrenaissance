import { wouldSelfCollide } from './collision';
import type { SteeringInput } from './flight';
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

export type ContinuousControlMetrics = Readonly<{
  totalGridCellEntries: number;
  averageSteeringMagnitude: number;
  maxConsecutiveNonZeroSteeringTicks: number;
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

export function steeringMagnitude(input: SteeringInput): number {
  return Math.min(1, Math.hypot(input.yaw, input.pitch));
}

export class ContinuousControlMetricsTracker {
  private totalEntries = 0;
  private steeringMagnitudeTotal = 0;
  private steeringTicks = 0;
  private currentNonZeroSteeringTicks = 0;
  private maxNonZeroSteeringTicks = 0;

  recordGridEntries(count: number): void {
    if (!Number.isInteger(count) || count < 0) {
      throw new RangeError('Grid entry count must be a non-negative integer');
    }
    this.totalEntries += count;
  }

  observeSteering(input: SteeringInput): void {
    const magnitude = steeringMagnitude(input);
    this.steeringMagnitudeTotal += magnitude;
    this.steeringTicks += 1;

    if (magnitude > 0) {
      this.currentNonZeroSteeringTicks += 1;
      this.maxNonZeroSteeringTicks = Math.max(
        this.maxNonZeroSteeringTicks,
        this.currentNonZeroSteeringTicks
      );
    } else {
      this.currentNonZeroSteeringTicks = 0;
    }
  }

  snapshot(): ContinuousControlMetrics {
    return Object.freeze({
      totalGridCellEntries: this.totalEntries,
      averageSteeringMagnitude: this.steeringTicks > 0
        ? this.steeringMagnitudeTotal / this.steeringTicks
        : 0,
      maxConsecutiveNonZeroSteeringTicks: this.maxNonZeroSteeringTicks
    });
  }
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
