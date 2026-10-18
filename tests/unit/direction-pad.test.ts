import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GridDirection } from '../../src/game/grid-types';
import * as padModule from '../../src/input/direction-pad';

describe('SNEK CORE V4 six-direction mobile pad', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders exactly six unique world-direction buttons', () => {
    const createDirectionPad = (padModule as unknown as {
      createDirectionPad?: (onDirection: (direction: GridDirection) => void) => HTMLElement;
    }).createDirectionPad;
    expect(typeof createDirectionPad).toBe('function');
    if (!createDirectionPad) return;

    const pad = createDirectionPad(() => {});
    const buttons = [...pad.querySelectorAll<HTMLElement>('[data-world-direction]')];
    expect(pad).toHaveProperty('dataset');
    expect(pad.dataset.directionPad).toBe('');
    expect(buttons).toHaveLength(6);
    expect(new Set(buttons.map((button) => button.dataset.worldDirection))).toEqual(
      new Set(['+X', '-X', '+Y', '-Y', '+Z', '-Z'])
    );
  });

  it('emits exactly one discrete direction on pointerdown and none on pointermove', () => {
    const createDirectionPad = (padModule as unknown as {
      createDirectionPad?: (onDirection: (direction: GridDirection) => void) => HTMLElement;
    }).createDirectionPad;
    expect(typeof createDirectionPad).toBe('function');
    if (!createDirectionPad) return;

    const onDirection = vi.fn();
    const pad = createDirectionPad(onDirection);
    const button = pad.querySelector<HTMLElement>('[data-world-direction="+X"]');
    expect(button).not.toBeNull();
    if (!button) return;

    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    button.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    expect(onDirection).toHaveBeenCalledTimes(1);
    expect(onDirection).toHaveBeenCalledWith('+X');
  });

  it('labels depth commands distinctly as FRENTE and FUNDO', () => {
    const createDirectionPad = (padModule as unknown as {
      createDirectionPad?: (onDirection: (direction: GridDirection) => void) => HTMLElement;
    }).createDirectionPad;
    expect(typeof createDirectionPad).toBe('function');
    if (!createDirectionPad) return;

    const pad = createDirectionPad(() => {});
    expect(pad.querySelector('[data-world-direction="+Z"]')?.textContent).toBe('FRENTE');
    expect(pad.querySelector('[data-world-direction="-Z"]')?.textContent).toBe('FUNDO');
  });
});
