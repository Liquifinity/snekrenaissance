// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { AppController } from '../../src/app/app-controller';

function setup(): { root: HTMLElement; controller: AppController } {
  document.body.innerHTML = '<main id="app"><canvas id="game-canvas"></canvas></main>';
  localStorage.clear();
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('missing root');
  const controller = new AppController({ root });
  controller.mount();
  return { root, controller };
}

function click(selector: string, root: HTMLElement): void {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`missing ${selector}`);
  element.click();
}

describe('meme-first application flow', () => {
  beforeEach(() => localStorage.clear());

  it('renders the exact canonical two-line meme first', () => {
    const { root, controller } = setup();
    const lines = [...root.querySelectorAll<HTMLElement>('[data-copy-line]')].map((el) => el.textContent);

    expect(controller.screen).toBe('intro');
    expect(lines).toEqual([
      'just because ChatGPT',
      "didn't complete my image."
    ]);
    expect(root.querySelector('input')).toBeNull();
  });

  it('clicking the meme advances to username entry', () => {
    const { root, controller } = setup();
    click('[data-action="continue"]', root);

    expect(controller.screen).toBe('username');
    expect(root.querySelector('input[name="username"]')).not.toBeNull();
    expect(root.querySelector('input[type="email"]')).toBeNull();
    expect(root.querySelector('input[type="password"]')).toBeNull();
  });

  it('does not start with a blank or whitespace username', () => {
    const { root, controller } = setup();
    click('[data-action="continue"]', root);
    const input = root.querySelector<HTMLInputElement>('input[name="username"]');
    if (!input) throw new Error('missing username');
    input.value = '   ';
    click('[data-action="play"]', root);

    expect(controller.screen).toBe('username');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('username');
  });

  it('starts a run with a valid username and shows current length in the HUD', () => {
    const { root, controller } = setup();
    click('[data-action="continue"]', root);
    const input = root.querySelector<HTMLInputElement>('input[name="username"]');
    if (!input) throw new Error('missing username');
    input.value = 'snekboi';
    click('[data-action="play"]', root);

    expect(controller.screen).toBe('game');
    expect(controller.currentRun?.phase).toBe('playing');
    expect(root.querySelector('[data-hud-length]')?.textContent).toContain('12');
    expect(localStorage.getItem('snek.username')).toBe('snekboi');
  });

  it('shows LENGTH, BEST, WORLD unranked state, replay and rank at game over', () => {
    const { root, controller } = setup();
    click('[data-action="continue"]', root);
    const input = root.querySelector<HTMLInputElement>('input[name="username"]');
    if (!input) throw new Error('missing username');
    input.value = 'ren';
    click('[data-action="play"]', root);

    const run = controller.currentRun;
    if (!run) throw new Error('missing run');
    run.phase = 'game-over';
    run.result = { maxLength: 24, foodEaten: 3, durationMs: 9000 };
    run.maxLength = 24;
    controller.handleRunState(run);

    expect(controller.screen).toBe('game-over');
    expect(root.textContent).toContain('LENGTH');
    expect(root.textContent).toContain('24');
    expect(root.textContent).toContain('BEST');
    expect(root.textContent).toContain('WORLD');
    expect(root.textContent).toContain('UNRANKED');
    expect(root.querySelector('[data-action="replay"]')).not.toBeNull();
    expect(root.querySelector('[data-action="rank"]')).not.toBeNull();
  });

  it('replay starts immediately without asking for username again', () => {
    const { root, controller } = setup();
    click('[data-action="continue"]', root);
    const input = root.querySelector<HTMLInputElement>('input[name="username"]');
    if (!input) throw new Error('missing username');
    input.value = 'ren';
    click('[data-action="play"]', root);

    const run = controller.currentRun;
    if (!run) throw new Error('missing run');
    run.phase = 'game-over';
    run.result = { maxLength: 12, foodEaten: 0, durationMs: 1000 };
    controller.handleRunState(run);
    click('[data-action="replay"]', root);

    expect(controller.screen).toBe('game');
    expect(controller.currentRun?.phase).toBe('playing');
    expect(root.querySelector('input[name="username"]')).toBeNull();
  });
});
