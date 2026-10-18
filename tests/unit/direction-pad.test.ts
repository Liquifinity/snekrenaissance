// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GridDirection } from '../../src/game/grid-types';

type DirectionPadModule = {
  createDirectionPad: (onDirection: (direction: GridDirection) => void) => HTMLElement;
};

async function loadDirectionPad(): Promise<DirectionPadModule | null> {
  try {
    const path = '../../src/input/' + 'direction-pad';
    return await import(path) as DirectionPadModule;
  } catch {
    return null;
  }
}

describe('SNEK CORE V4 six-direction mobile pad', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders exactly six unique world-direction buttons', async () => {
    const module = await loadDirectionPad();
    expect(module).not.toBeNull();
    if (!module) return;

    const pad = module.createDirectionPad(() => {});
    const buttons = [...pad.querySelectorAll<HTMLElement>('[data-world-direction]')];
    expect(pad.dataset.directionPad).toBe('');
    expect(buttons).toHaveLength(6);
    expect(new Set(buttons.map((button) => button.dataset.worldDirection))).toEqual(
      new Set(['+X', '-X', '+Y', '-Y', '+Z', '-Z'])
    );
  });

  it('emits exactly one discrete direction on pointerdown and none on pointermove', async () => {
    const module = await loadDirectionPad();
    expect(module).not.toBeNull();
    if (!module) return;

    const onDirection = vi.fn();
    const pad = module.createDirectionPad(onDirection);
    const button = pad.querySelector<HTMLElement>('[data-world-direction="+X"]');
    expect(button).not.toBeNull();
    if (!button) return;

    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    button.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    expect(onDirection).toHaveBeenCalledTimes(1);
    expect(onDirection).toHaveBeenCalledWith('+X');
  });

  it('labels depth commands distinctly as FRENTE and FUNDO', async () => {
    const module = await loadDirectionPad();
    expect(module).not.toBeNull();
    if (!module) return;

    const pad = module.createDirectionPad(() => {});
    expect(pad.querySelector('[data-world-direction="+Z"]')?.textContent).toBe('FRENTE');
    expect(pad.querySelector('[data-world-direction="-Z"]')?.textContent).toBe('FUNDO');
  });
});
