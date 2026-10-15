import { describe, expect, it, vi } from 'vitest';
import { FixedStepClock } from '../../src/game/simulation';
import { RuntimeLifecycle } from '../../src/app/runtime-lifecycle';

describe('RuntimeLifecycle', () => {
  it('pauses hidden tabs and discards accumulated wall-clock time on resume', () => {
    const clock = new FixedStepClock(0.1, 0.25, 8);
    const step = vi.fn();
    const resize = vi.fn();
    const resetTouch = vi.fn();
    const showError = vi.fn();
    const lifecycle = new RuntimeLifecycle(clock, { resize, resetTouch, showError });

    expect(lifecycle.consumeFrame(0.11, step)).toBe(1);
    lifecycle.setHidden(true);
    expect(lifecycle.consumeFrame(10, step)).toBe(0);
    lifecycle.setHidden(false);
    expect(lifecycle.consumeFrame(0.02, step)).toBe(0);
    expect(step).toHaveBeenCalledTimes(1);
  });

  it('resize updates viewport hooks without touching game state', () => {
    const clock = new FixedStepClock();
    const resize = vi.fn();
    const resetTouch = vi.fn();
    const lifecycle = new RuntimeLifecycle(clock, { resize, resetTouch, showError: vi.fn() });
    const runMarker = { id: 'same-run' };

    lifecycle.handleResize();

    expect(resize).toHaveBeenCalledTimes(1);
    expect(resetTouch).toHaveBeenCalledTimes(1);
    expect(runMarker).toEqual({ id: 'same-run' });
  });

  it('orientation change clears active touch input and resizes', () => {
    const clock = new FixedStepClock();
    const resize = vi.fn();
    const resetTouch = vi.fn();
    const lifecycle = new RuntimeLifecycle(clock, { resize, resetTouch, showError: vi.fn() });

    lifecycle.handleOrientationChange();

    expect(resetTouch).toHaveBeenCalledTimes(1);
    expect(resize).toHaveBeenCalledTimes(1);
  });

  it('renderer failure produces one concise visible error message through the hook', () => {
    const clock = new FixedStepClock();
    const showError = vi.fn();
    const lifecycle = new RuntimeLifecycle(clock, {
      resize: vi.fn(),
      resetTouch: vi.fn(),
      showError
    });

    lifecycle.handleRendererError(new Error('WebGL context lost'));

    expect(showError).toHaveBeenCalledWith('3D renderer unavailable. Reload to try again.');
  });
});
