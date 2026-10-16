import { describe, expect, it, vi } from 'vitest';
import { WORLD_SIZE } from '../../src/game/constants';
import { createInitialOrientation } from '../../src/game/steering';
import { advanceHead, FixedStepClock } from '../../src/game/simulation';

describe('head motion', () => {
  it('advances at constant configured speed', () => {
    const result = advanceHead({ x: 0, y: 0, z: 0 }, createInitialOrientation(), 0.25, 4, WORLD_SIZE);
    expect(result.unwrappedPosition).toEqual({ x: 0, y: 0, z: 1 });
    expect(result.wrappedPosition).toEqual({ x: 0, y: 0, z: 1 });
  });

  it('wraps wall crossing without changing direction or logical continuity', () => {
    const half = WORLD_SIZE / 2;
    const result = advanceHead({ x: 0, y: 0, z: half - 0.1 }, createInitialOrientation(), 0.1, 2, WORLD_SIZE);
    expect(result.unwrappedPosition.z).toBeCloseTo(half + 0.1);
    expect(result.wrappedPosition.z).toBeCloseTo(-half + 0.1);
    expect(result.forward).toEqual({ x: 0, y: 0, z: 1 });
  });
});

describe('FixedStepClock', () => {
  it('limits catch-up work for a huge frame delta', () => {
    const clock = new FixedStepClock(1 / 60, 0.25, 8);
    const step = vi.fn();
    const steps = clock.consume(10, step);

    expect(steps).toBe(8);
    expect(step).toHaveBeenCalledTimes(8);
    for (const call of step.mock.calls) {
      expect(call[0]).toBeCloseTo(1 / 60);
    }
  });

  it('accumulates small frame deltas into deterministic fixed steps', () => {
    const clock = new FixedStepClock(0.1, 0.25, 8);
    const step = vi.fn();

    expect(clock.consume(0.04, step)).toBe(0);
    expect(clock.consume(0.07, step)).toBe(1);
    expect(step).toHaveBeenCalledTimes(1);
    expect(step).toHaveBeenLastCalledWith(0.1);
  });
});
