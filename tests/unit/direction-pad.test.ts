// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ViewCommand } from '../../src/render/view-frame';

type DirectionPadModule = {
  createDirectionPad: (onCommand: (command: ViewCommand) => void) => HTMLElement;
};

async function loadDirectionPad(): Promise<DirectionPadModule | null> {
  try {
    const path = '../../src/input/' + 'direction-pad';
    return await import(path) as DirectionPadModule;
  } catch {
    return null;
  }
}

describe('SNEK CORE V5 six-command mobile pad', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders exactly six semantic buttons without world-axis labels', async () => {
    const module = await loadDirectionPad();
    expect(module).not.toBeNull();
    if (!module) return;

    const pad = module.createDirectionPad(() => {});
    const buttons = [...pad.querySelectorAll<HTMLElement>('[data-view-command]')];
    expect(pad.dataset.directionPad).toBe('');
    expect(buttons).toHaveLength(6);
    expect(new Set(buttons.map((button) => button.dataset.viewCommand))).toEqual(
      new Set(['up', 'down', 'left', 'right', 'towardViewer', 'intoScreen'])
    );
    expect(pad.textContent).not.toMatch(/[+-][XYZ]/);
  });

  it('emits exactly one semantic command on pointerdown', async () => {
    const module = await loadDirectionPad();
    expect(module).not.toBeNull();
    if (!module) return;

    const onCommand = vi.fn();
    const pad = module.createDirectionPad(onCommand);
    const button = pad.querySelector<HTMLElement>('[data-view-command="right"]');
    expect(button).not.toBeNull();
    if (!button) return;

    button.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    button.dispatchEvent(new Event('pointermove', { bubbles: true, cancelable: true }));
    expect(onCommand).toHaveBeenCalledTimes(1);
    expect(onCommand).toHaveBeenCalledWith('right');
  });

  it('labels depth commands distinctly as FRENTE and FUNDO', async () => {
    const module = await loadDirectionPad();
    expect(module).not.toBeNull();
    if (!module) return;

    const pad = module.createDirectionPad(() => {});
    expect(pad.querySelector('[data-view-command="towardViewer"]')?.textContent).toBe('FRENTE');
    expect(pad.querySelector('[data-view-command="intoScreen"]')?.textContent).toBe('FUNDO');
  });

  it('contains pointer events at the pad boundary so canvas orbit cannot receive them', async () => {
    const module = await loadDirectionPad();
    expect(module).not.toBeNull();
    if (!module) return;

    const outer = document.createElement('div');
    const pad = module.createDirectionPad(() => {});
    outer.append(pad);
    const outerPointer = vi.fn();
    outer.addEventListener('pointerdown', outerPointer);
    outer.addEventListener('pointermove', outerPointer);

    const button = pad.querySelector<HTMLElement>('[data-view-command="up"]');
    expect(button).not.toBeNull();
    if (!button) return;

    const down = new Event('pointerdown', { bubbles: true, cancelable: true });
    const move = new Event('pointermove', { bubbles: true, cancelable: true });
    button.dispatchEvent(down);
    button.dispatchEvent(move);

    expect(down.defaultPrevented).toBe(true);
    expect(move.defaultPrevented).toBe(true);
    expect(outerPointer).not.toHaveBeenCalled();
  });
});
