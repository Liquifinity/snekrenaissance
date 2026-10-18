// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { AppController } from '../../src/app/app-controller';
import { RULESET_ID } from '../../src/game/grid-config';

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

function finishRun(controller: AppController, score: number): void {
  const run = controller.currentRun;
  if (!run) throw new Error('missing run');
  const length = run.snake.segments.length;
  run.phase = 'game-over';
  run.result = {
    rulesetId: RULESET_ID,
    score,
    foodsCollected: score,
    length,
    maxLength: Math.max(run.maxLength, length),
    foodEaten: score,
    durationMs: 1000
  };
  run.foodsCollected = score;
  run.score = score;
  run.foodEaten = score;
  controller.handleRunState(run);
}

describe('meme-first application flow', () => {
  beforeEach(() => localStorage.clear());

  it('renders the exact canonical two-line meme first', () => {
    const { root, controller } = setup();
    const lines = [...root.querySelectorAll<HTMLElement>('[data-copy-line]')].map((el) => el.textContent);
    expect(controller.screen).toBe('intro');
    expect(lines).toEqual(['just because ChatGPT', 'didnt complete my image.']);
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

  it('starts a V5 run with score, length, progress bar, and stored identity', () => {
    const { root, controller } = setup();
    enterUsernameAndPlay(root, 'snekboi');
    expect(controller.screen).toBe('game');
    expect(controller.currentRun?.phase).toBe('playing');
    expect(controller.currentRun?.result).toBeNull();
    expect(root.querySelector('[data-hud-score]')?.textContent).toBe('SCORE 0');
    expect(root.querySelector('[data-hud-length]')?.textContent).toBe('LENGTH 6');
    expect(root.querySelector('[data-progress-track]')).not.toBeNull();
    expect(root.querySelector<HTMLElement>('[data-progress-fill]')?.style.width).toBe('0%');
    expect(root.querySelector('[data-progress-label]')?.textContent).toBe('0.0%');
    expect(localStorage.getItem('snek.username')).toBe('snekboi');
  });

  it('updates progress only in completed groups of ten foods', () => {
    const { root, controller } = setup();
    enterUsernameAndPlay(root, 'ren');
    const run = controller.currentRun;
    if (!run) throw new Error('missing run');
    run.foodsCollected = 9;
    run.score = 9;
    run.foodEaten = 9;
    controller.handleRunState(run);
    expect(root.querySelector('[data-progress-label]')?.textContent).toBe('0.0%');
    run.foodsCollected = 10;
    run.score = 10;
    run.foodEaten = 10;
    controller.handleRunState(run);
    expect(root.querySelector('[data-progress-label]')?.textContent).toBe('3.3%');
    expect(root.querySelector('[data-hud-score]')?.textContent).toBe('SCORE 10');
  });

  it('shows the supplied water image instead of game over when the run reaches 100%', () => {
    const { root, controller } = setup();
    enterUsernameAndPlay(root, 'ren');
    const run = controller.currentRun;
    if (!run) throw new Error('missing run');
    run.phase = 'completed';
    run.foodsCollected = 300;
    run.score = 300;
    run.foodEaten = 300;
    run.result = {
      rulesetId: RULESET_ID,
      score: 300,
      foodsCollected: 300,
      length: run.snake.segments.length,
      maxLength: run.maxLength,
      foodEaten: 300,
      durationMs: 1000
    };
    controller.handleRunState(run);
    expect(controller.screen).toBe('complete');
    expect(root.textContent).toContain('YOUR IMAGE IS COMPLETED');
    const image = root.querySelector<HTMLImageElement>('[data-completion-image]');
    expect(image).not.toBeNull();
    expect(image?.getAttribute('src')).toContain('completed-water');
    expect(root.textContent).not.toContain('GAME OVER');
  });

  it('shows V5 food score and personal best for a local game over', () => {
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

  it('shows the local V5 score record without public leaderboard language', () => {
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

  it('keeps the highest V5 food-score best without overwriting V4, V3, or older history', () => {
    localStorage.setItem('snek.localBest', '0068');
    localStorage.setItem('snek.localBest.pixelGridV2', '0019');
    localStorage.setItem('snek.localBest.pixelGridV2_1', '0013');
    localStorage.setItem('snek.localBest.pixelGridV2_2', '0017');
    localStorage.setItem('snek.localBest.coreV3', '0031');
    localStorage.setItem('snek.localBest.coreV4', '0041');
    const first = setup({ clearStorage: false });
    enterUsernameAndPlay(first.root, 'ren');
    finishRun(first.controller, 24);
    const second = setup({ clearStorage: false });
    enterUsernameAndPlay(second.root, 'ren');
    finishRun(second.controller, 18);
    expect(second.root.textContent).toContain('PERSONAL BEST');
    expect(second.root.textContent).toContain('24');
    expect(localStorage.getItem('snek.localBest.coreV5')).toBe('24');
    expect(localStorage.getItem('snek.localBest.coreV4')).toBe('0041');
    expect(localStorage.getItem('snek.localBest.coreV3')).toBe('0031');
    expect(localStorage.getItem('snek.localBest.pixelGridV2_2')).toBe('0017');
    expect(localStorage.getItem('snek.localBest.pixelGridV2_1')).toBe('0013');
    expect(localStorage.getItem('snek.localBest.pixelGridV2')).toBe('0019');
    expect(localStorage.getItem('snek.localBest')).toBe('0068');
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