import { describe, expect, it, vi } from 'vitest';
import { FixedStepClock } from '../../src/game/simulation';

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

  it('treats non-finite and negative frame deltas as zero input', () => {
    const clock = new FixedStepClock(0.1, 0.25, 8);
    const step = vi.fn();

    expect(clock.consume(Number.NaN, step)).toBe(0);
    expect(clock.consume(-1, step)).toBe(0);
    expect(step).not.toHaveBeenCalled();
  });

  it('reset clears residual accumulated time', () => {
    const clock = new FixedStepClock(0.1, 0.25, 8);
    const step = vi.fn();
    expect(clock.consume(0.09, step)).toBe(0);
    clock.reset();
    expect(clock.consume(0.02, step)).toBe(0);
  });
});
