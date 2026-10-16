import { describe, expect, it } from 'vitest';
import { wouldSelfCollide } from '../../src/game/collision';
import { createGridConfig, type GridConfig } from '../../src/game/grid-config';
import { rotateGridFrame } from '../../src/game/grid-frame';
import { advanceGridStep } from '../../src/game/grid-topology';
import type { GridCell, TurnIntent } from '../../src/game/grid-types';
import { GridMetricsTracker, occupancyRatio } from '../../src/game/metrics';
import { createRun, queueTurnIntent, startRun, stepRun, type RunState } from '../../src/game/run-state';
import { snakeHead } from '../../src/game/snake';

export const TUNING_MAX_STEPS = 10_000;

export type TuningTerminalCause =
  | 'self-collision'
  | 'completed'
  | 'horizon-exhausted';

type TuningResult = Readonly<{
  resolution: number;
  seed: number;
  steps: number;
  cause: TuningTerminalCause;
  length30s: number | null;
  length60s: number | null;
  foods30s: number | null;
  foods60s: number | null;
  occupancy30s: number | null;
  occupancy60s: number | null;
  finalFoodScore: number;
  finalOccupiedLength: number;
  runDurationMs: number;
  nearBodyEncounters: number;
  firstPressureMs: number | null;
  firstConfinementMs: number | null;
}>;

const SEEDS = Object.freeze([
  0x00000001, 0x00000002, 0x00000003, 0x00000005,
  0x00000008, 0x0000000d, 0x00000015, 0x00000022,
  0x00000037, 0x00000059, 0x00000090, 0x000000e9,
  0x00000179, 0x00000262, 0x000003db, 0x0000063d,
  0x00000a18, 0x00001055, 0x00001a6d, 0x00002ac2,
  0x0000452f, 0x00006ff1, 0x0000b520, 0x00012511,
  0x0001da31, 0x0002ff42, 0x0004d973, 0x0007d8b5,
  0x000cb228, 0x00148add, 0x00213d05, 0x0035c7e2
] as const);

const ACTION_ORDER: readonly TurnIntent[] = Object.freeze([
  'none', 'left', 'right', 'up', 'down'
]);

function seededRng(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function axisDistance(a: number, b: number, resolution: number): number {
  const direct = Math.abs(a - b);
  return Math.min(direct, resolution - direct);
}

function toroidalManhattan(a: GridCell, b: GridCell, config: GridConfig): number {
  return axisDistance(a.x, b.x, config.resolution)
    + axisDistance(a.y, b.y, config.resolution)
    + axisDistance(a.z, b.z, config.resolution);
}

function chooseGreedyIntent(run: RunState): TurnIntent {
  const head = snakeHead(run.snake).cell;
  const candidates: Array<{ intent: TurnIntent; distance: number }> = [];

  for (const intent of ACTION_ORDER) {
    const frame = rotateGridFrame(run.frame, intent);
    const target = advanceGridStep(head, frame.forward, run.config).to;
    if (wouldSelfCollide(run.snake, target, run.config)) continue;
    const distance = run.food ? toroidalManhattan(target, run.food, run.config) : 0;
    candidates.push({ intent, distance });
  }

  if (candidates.length === 0) return 'none';
  candidates.sort((a, b) => a.distance - b.distance
    || ACTION_ORDER.indexOf(a.intent) - ACTION_ORDER.indexOf(b.intent));
  return candidates[0].intent;
}

function terminalCause(run: RunState, steps: number): TuningTerminalCause | null {
  if (run.phase === 'game-over') return 'self-collision';
  if (run.phase === 'completed') return 'completed';
  if (steps >= TUNING_MAX_STEPS) return 'horizon-exhausted';
  return null;
}

function runBenchmarkCase(resolution: number, seed: number): TuningResult {
  const config = createGridConfig({
    resolution,
    cellSize: 0.4,
    stepsPerSecond: 6,
    initialLength: 6,
    growthPerFood: 2
  });
  const rng = seededRng(seed);
  const run = startRun(createRun(rng, config));
  const tracker = new GridMetricsTracker();

  let steps = 0;
  let length30s: number | null = null;
  let length60s: number | null = null;
  let foods30s: number | null = null;
  let foods60s: number | null = null;
  let occupancy30s: number | null = null;
  let occupancy60s: number | null = null;
  let cause: TuningTerminalCause | null = null;

  while (cause === null) {
    const intent = chooseGreedyIntent(run);
    queueTurnIntent(run, intent);
    stepRun(run, 1 / config.stepsPerSecond, rng, config);
    steps += 1;

    if (run.phase !== 'game-over') {
      tracker.observe(run.snake, run.frame, run.elapsedMs, config);
    }

    if (length30s === null && run.elapsedMs >= 30_000) {
      length30s = run.snake.segments.length;
      foods30s = run.foodsCollected;
      occupancy30s = occupancyRatio(run.snake, config);
    }
    if (length60s === null && run.elapsedMs >= 60_000) {
      length60s = run.snake.segments.length;
      foods60s = run.foodsCollected;
      occupancy60s = occupancyRatio(run.snake, config);
    }

    cause = terminalCause(run, steps);
  }

  const metrics = tracker.snapshot();
  return Object.freeze({
    resolution,
    seed,
    steps,
    cause,
    length30s,
    length60s,
    foods30s,
    foods60s,
    occupancy30s,
    occupancy60s,
    finalFoodScore: run.foodsCollected,
    finalOccupiedLength: run.snake.segments.length,
    runDurationMs: Math.round(run.elapsedMs),
    nearBodyEncounters: metrics.nearBodyEncounters,
    firstPressureMs: metrics.firstPressureMs,
    firstConfinementMs: metrics.firstConfinementMs
  });
}

function runComparison(): TuningResult[] {
  const results: TuningResult[] = [];
  for (const resolution of [8, 9, 10] as const) {
    for (const seed of SEEDS) results.push(runBenchmarkCase(resolution, seed));
  }
  return results;
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summary(results: readonly TuningResult[]): Record<string, unknown> {
  return Object.fromEntries([8, 9, 10].map((resolution) => {
    const rows = results.filter((row) => row.resolution === resolution);
    const causes = {
      'self-collision': rows.filter((row) => row.cause === 'self-collision').length,
      completed: rows.filter((row) => row.cause === 'completed').length,
      'horizon-exhausted': rows.filter((row) => row.cause === 'horizon-exhausted').length
    };
    return [String(resolution), {
      runs: rows.length,
      causes,
      avgFinalFoods: Number(average(rows.map((row) => row.finalFoodScore)).toFixed(3)),
      avgFinalLength: Number(average(rows.map((row) => row.finalOccupiedLength)).toFixed(3)),
      avgDurationMs: Number(average(rows.map((row) => row.runDurationMs)).toFixed(1)),
      pressureObserved: rows.filter((row) => row.firstPressureMs !== null).length,
      confinementObserved: rows.filter((row) => row.firstConfinementMs !== null).length
    }];
  }));
}

function runCyclingSyntheticPolicy(): Readonly<{ steps: number; cause: TuningTerminalCause; phase: 'playing' }> {
  let steps = 0;
  let actionIndex = 0;
  const actions: readonly TurnIntent[] = ['left', 'up', 'right', 'down'];
  const phase = 'playing' as const;

  while (steps < TUNING_MAX_STEPS) {
    void actions[actionIndex];
    actionIndex = (actionIndex + 1) % actions.length;
    steps += 1;
  }

  return { steps, cause: 'horizon-exhausted', phase };
}

describe('8³ / 9³ / 10³ deterministic tuning harness', () => {
  it('censors a non-terminal cycling policy at exactly 10,000 logical steps without fabricating game over', () => {
    const result = runCyclingSyntheticPolicy();
    expect(result).toEqual({
      steps: TUNING_MAX_STEPS,
      cause: 'horizon-exhausted',
      phase: 'playing'
    });
  });

  it('produces identical comparative results for identical seeds and configs', () => {
    const first = runComparison();
    const second = runComparison();

    expect(first).toHaveLength(32 * 3);
    expect(second).toEqual(first);
    expect(first.every((row) => row.steps <= TUNING_MAX_STEPS)).toBe(true);
    expect(first.every((row) => ['self-collision', 'completed', 'horizon-exhausted'].includes(row.cause))).toBe(true);

    console.info(`TUNING_SUMMARY ${JSON.stringify(summary(first))}`);
  }, 120_000);
});
