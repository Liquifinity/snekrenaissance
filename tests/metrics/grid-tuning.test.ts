import { describe, expect, it } from 'vitest';

export const TUNING_MAX_STEPS = 10_000;

export const HISTORICAL_V2_TUNING_SUMMARY = Object.freeze({
  8: Object.freeze({
    runs: 32,
    causes: Object.freeze({ selfCollision: 32, completed: 0, horizonExhausted: 0 }),
    avgFinalFoods: 94.969,
    avgFinalLength: 195.5,
    avgDurationMs: 112807.3,
    pressureObserved: 32,
    confinementObserved: 32
  }),
  9: Object.freeze({
    runs: 32,
    causes: Object.freeze({ selfCollision: 32, completed: 0, horizonExhausted: 0 }),
    avgFinalFoods: 126.781,
    avgFinalLength: 259.281,
    avgDurationMs: 166703.2,
    pressureObserved: 32,
    confinementObserved: 32
  }),
  10: Object.freeze({
    runs: 32,
    causes: Object.freeze({ selfCollision: 32, completed: 0, horizonExhausted: 0 }),
    avgFinalFoods: 150.531,
    avgFinalLength: 306.938,
    avgDurationMs: 221979.1,
    pressureObserved: 32,
    confinementObserved: 32
  })
});

describe('historical Pixel Flight Grid V2 discrete tuning evidence', () => {
  it('preserves the accepted 32-seed 8³ / 9³ / 10³ comparison without binding V2.1 runtime', () => {
    expect(HISTORICAL_V2_TUNING_SUMMARY).toEqual({
      8: {
        runs: 32,
        causes: { selfCollision: 32, completed: 0, horizonExhausted: 0 },
        avgFinalFoods: 94.969,
        avgFinalLength: 195.5,
        avgDurationMs: 112807.3,
        pressureObserved: 32,
        confinementObserved: 32
      },
      9: {
        runs: 32,
        causes: { selfCollision: 32, completed: 0, horizonExhausted: 0 },
        avgFinalFoods: 126.781,
        avgFinalLength: 259.281,
        avgDurationMs: 166703.2,
        pressureObserved: 32,
        confinementObserved: 32
      },
      10: {
        runs: 32,
        causes: { selfCollision: 32, completed: 0, horizonExhausted: 0 },
        avgFinalFoods: 150.531,
        avgFinalLength: 306.938,
        avgDurationMs: 221979.1,
        pressureObserved: 32,
        confinementObserved: 32
      }
    });
  });

  it('retains the historical 10,000-step censoring horizon and makes no V2.1 tuning claim', () => {
    expect(TUNING_MAX_STEPS).toBe(10_000);
    expect(Object.keys(HISTORICAL_V2_TUNING_SUMMARY)).toEqual(['8', '9', '10']);
  });
});
