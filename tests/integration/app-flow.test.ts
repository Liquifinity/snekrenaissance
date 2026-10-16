// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { AppController } from '../../src/app/app-controller';

function setup(options: { clearStorage?: boolean } = {}): { root: HTMLElement; controller: AppController } {
  document.body.innerHTML = '<main id="app"><canvas id="game-canvas"></canvas></main>';
  if (options.clearStorage ?? true) localStorage.clear();
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

function enterUsernameAndPlay(root: HTMLElement, username: string): void {
  click('[data-action="continue"]', root);
  const input = root.querySelector<HTMLInputElement>('input[name="username"]');
  if (!input) throw new Error('missing username');
  input.value = username;
  click('[data-action="play"]', root);
}

function finishRun(controller: AppController, maxLength: number): void {
  const run = controller.currentRun;
  if (!run) throw new Error('missing run');
  run.phase = 'game-over';
  run.result = { maxLength, foodEaten: 0, durationMs: 1000 };
  run.maxLength = maxLength;
  controller.handleRunState(run);
}

describe('meme-first application flow', () => {
  beforeEach(() => localStorage.clear());

  it('renders the exact canonical two-line meme first', () => {
    const { root, controller } = setup();
    const lines = [...root.querySelectorAll<HTMLElement>('[data-copy-line]')].map((el) => el.textContent);

    expect(controller.screen).toBe('intro');
    expect(lines).toEqual([
      'just because ChatGPT',
      'didnt complete my image.'
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

  it('starts a run with a valid username and stores it locally', () => {
    const { root, controller } = setup();
    enterUsernameAndPlay(root, 'snekboi');

    expect(controller.screen).toBe('game');
    expect(controller.currentRun?.phase).toBe('playing');
    expect(root.querySelector('[data-hud-length]')?.textContent).toContain('12');
    expect(localStorage.getItem('snek.username')).toBe('snekboi');
  });

  it('shows only SCORE and PERSONAL BEST for a local game over', () => {
    const { root, controller } = setup();
    enterUsernameAndPlay(root, 'ren');
    finishRun(controller, 24);

    expect(controller.screen).toBe('game-over');
    expect(root.textContent).toContain('SCORE');
    expect(root.textContent).toContain('24');
    expect(root.textContent).toContain('PERSONAL BEST');
    expect(root.textContent).not.toContain('WORLD');
    expect(root.textContent).not.toContain('UNRANKED');
    expect(root.querySelector('[data-action="replay"]')).not.toBeNull();
    expect(root.querySelector('[data-action="rank"]')).not.toBeNull();
  });

  it('shows the local record without public leaderboard language', () => {
    const { root, controller } = setup();
    enterUsernameAndPlay(root, 'ren');
    finishRun(controller, 24);
    click('[data-action="rank"]', root);

    expect(controller.screen).toBe('rank');
    expect(root.textContent).toContain('PERSONAL BEST');
    expect(root.textContent).toContain('24');
    expect(root.textContent).not.toContain('UNRANKED');
    expect(root.textContent).not.toContain('public leaderboard');
  });

  it('restores the username after a reload', () => {
    const first = setup();
    enterUsernameAndPlay(first.root, 'renato');

    const second = setup({ clearStorage: false });
    click('[data-action="continue"]', second.root);
    const input = second.root.querySelector<HTMLInputElement>('input[name="username"]');

    expect(input?.value).toBe('renato');
  });

  it('keeps the highest personal best after a lower later score and reload', () => {
    const first = setup();
    enterUsernameAndPlay(first.root, 'ren');
    finishRun(first.controller, 24);

    const second = setup({ clearStorage: false });
    enterUsernameAndPlay(second.root, 'ren');
    finishRun(second.controller, 18);

    expect(second.root.textContent).toContain('PERSONAL BEST');
    expect(second.root.textContent).toContain('24');
    expect(localStorage.getItem('snek.localBest')).toBe('24');

    const third = setup({ clearStorage: false });
    click('[data-action="continue"]', third.root);
    const input = third.root.querySelector<HTMLInputElement>('input[name="username"]');
    expect(input?.value).toBe('ren');
  });

  it('replay starts immediately without asking for username again', () => {
    const { root, controller } = setup();
    enterUsernameAndPlay(root, 'ren');
    finishRun(controller, 12);
    click('[data-action="replay"]', root);

    expect(controller.screen).toBe('game');
    expect(controller.currentRun?.phase).toBe('playing');
    expect(root.querySelector('input[name="username"]')).toBeNull();
  });
});
