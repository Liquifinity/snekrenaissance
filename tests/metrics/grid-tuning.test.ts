import { describe, expect, it } from 'vitest';
import { RULESET_ID } from '../../src/game/grid-config';

export const TUNING_MAX_STEPS = 10_000;

export type TuningTerminalCause =
  | 'self-collision'
  | 'completed'
  | 'horizon-exhausted';

export const HISTORICAL_V2_TUNING_SUMMARY = Object.freeze({
  rulesetId: 'pixel-flight-grid-v2',
  horizonSteps: TUNING_MAX_STEPS,
  seedsPerResolution: 32,
  resolutions: Object.freeze({
    8: Object.freeze({
      runs: 32,
      selfCollision: 32,
      completed: 0,
      horizonExhausted: 0,
      avgFinalFoods: 94.969,
      avgFinalLength: 195.5,
      avgDurationMs: 112807.3,
      pressureObserved: 32,
      confinementObserved: 32
    }),
    9: Object.freeze({
      runs: 32,
      selfCollision: 32,
      completed: 0,
      horizonExhausted: 0,
      avgFinalFoods: 126.781,
      avgFinalLength: 259.281,
      avgDurationMs: 166703.2,
      pressureObserved: 32,
      confinementObserved: 32
    }),
    10: Object.freeze({
      runs: 32,
      selfCollision: 32,
      completed: 0,
      horizonExhausted: 0,
      avgFinalFoods: 150.531,
      avgFinalLength: 306.938,
      avgDurationMs: 221979.1,
      pressureObserved: 32,
      confinementObserved: 32
    })
  })
});

describe('historical V2 discrete tuning evidence', () => {
  it('retains the accepted bounded V2 benchmark without presenting it as V2.1 evidence', () => {
    expect(HISTORICAL_V2_TUNING_SUMMARY.rulesetId).toBe('pixel-flight-grid-v2');
    expect(RULESET_ID).toBe('pixel-flight-grid-v2-1');
    expect(HISTORICAL_V2_TUNING_SUMMARY.horizonSteps).toBe(10_000);
    expect(HISTORICAL_V2_TUNING_SUMMARY.seedsPerResolution).toBe(32);
  });

  it('preserves the accepted 8³ / 9³ / 10³ V2 comparison as immutable historical data', () => {
    expect(HISTORICAL_V2_TUNING_SUMMARY.resolutions[8].avgFinalFoods).toBe(94.969);
    expect(HISTORICAL_V2_TUNING_SUMMARY.resolutions[9].avgFinalFoods).toBe(126.781);
    expect(HISTORICAL_V2_TUNING_SUMMARY.resolutions[10].avgFinalFoods).toBe(150.531);
    expect(Object.isFrozen(HISTORICAL_V2_TUNING_SUMMARY)).toBe(true);
    expect(Object.isFrozen(HISTORICAL_V2_TUNING_SUMMARY.resolutions)).toBe(true);
  });
});
