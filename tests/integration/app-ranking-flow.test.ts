// @vitest-environment jsdom

import { beforeEach, describe, expect, test } from 'vitest';
import { AppController } from '../../src/app/app-controller';
import type { PlayerIdentity } from '../../src/app/identity';
import { LocalSessionGateway, type SessionGateway, type SessionStart, type SessionSubmission } from '../../src/app/session-gateway';
import { RULESET_ID } from '../../src/game/grid-config';
import type { RunResult } from '../../src/game/run-state';
import type { LeaderboardResponse, PlayerRankResponse } from '../../src/shared/ranking-api';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function v2Result(maxLength: number, foodsCollected: number, durationMs: number): RunResult {
  return {
    rulesetId: RULESET_ID,
    score: foodsCollected,
    foodsCollected,
    length: maxLength,
    maxLength,
    durationMs,
    foodEaten: foodsCollected
  };
}

class ControlledRankedGateway implements SessionGateway {
  readonly startQueue: Deferred<SessionStart>[] = [];
  readonly submitQueue: Deferred<SessionSubmission>[] = [];
  readonly leaderboardQueue: Deferred<LeaderboardResponse>[] = [];
  readonly rankQueue: Deferred<PlayerRankResponse | null>[] = [];
  readonly startCalls: PlayerIdentity[] = [];
  readonly submitCalls: Array<{ identity: PlayerIdentity; sessionId: string; result: RunResult }> = [];
  readonly leaderboardCalls: Array<number | undefined> = [];
  readonly rankCalls: string[] = [];

  supportsRuleset(rulesetId: string): boolean {
    return rulesetId === RULESET_ID;
  }

  startRun(identity: PlayerIdentity): Promise<SessionStart> {
    this.startCalls.push({ ...identity });
    const next = deferred<SessionStart>();
    this.startQueue.push(next);
    return next.promise;
  }

  submitResult(identity: PlayerIdentity, sessionId: string, result: RunResult): Promise<SessionSubmission> {
    this.submitCalls.push({ identity: { ...identity }, sessionId, result: { ...result } });
    const next = deferred<SessionSubmission>();
    this.submitQueue.push(next);
    return next.promise;
  }

  getLeaderboard(limit?: number): Promise<LeaderboardResponse> {
    this.leaderboardCalls.push(limit);
    const next = deferred<LeaderboardResponse>();
    this.leaderboardQueue.push(next);
    return next.promise;
  }

  getPlayerRank(playerId: string): Promise<PlayerRankResponse | null> {
    this.rankCalls.push(playerId);
    const next = deferred<PlayerRankResponse | null>();
    this.rankQueue.push(next);
    return next.promise;
  }
}

function setup(gateway: SessionGateway): { root: HTMLElement; controller: AppController } {
  document.body.innerHTML = '<main id="app"><canvas id="game-canvas"></canvas></main>';
  localStorage.clear();
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('missing root');
  const controller = new AppController({ root, gateway });
  controller.mount();
  return { root, controller };
}

function click(root: HTMLElement, selector: string): void {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`missing ${selector}`);
  element.click();
}

function enterAndPlay(root: HTMLElement, username = 'ren'): void {
  click(root, '[data-action="continue"]');
  const input = root.querySelector<HTMLInputElement>('input[name="username"]');
  if (!input) throw new Error('missing username');
  input.value = username;
  click(root, '[data-action="play"]');
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function forceGameOver(controller: AppController, result: RunResult): void {
  const run = controller.currentRun;
  if (!run) throw new Error('missing run');
  run.phase = 'game-over';
  run.result = result;
  run.maxLength = result.maxLength;
  controller.handleRunState(run);
}

async function reachAcceptedGameOver(
  root: HTMLElement,
  controller: AppController,
  gateway: ControlledRankedGateway
): Promise<void> {
  enterAndPlay(root, 'ren');
  gateway.startQueue[0].resolve({ ranked: true, sessionId: 'session-1' });
  await flush();
  forceGameOver(controller, v2Result(16, 1, 1_000));
  gateway.submitQueue[0].resolve({ ranked: true, worldRank: 2 });
  await flush();
}

describe('ranked application lifecycle', () => {
  beforeEach(() => localStorage.clear());

  test('ranked PLAY waits for a server session before creating gameplay', async () => {
    const gateway = new ControlledRankedGateway();
    const { root, controller } = setup(gateway);
    enterAndPlay(root, 'ren');

    expect(controller.screen).toBe('username');
    expect(controller.currentRun).toBeNull();
    expect(root.querySelector('[data-session-status="starting"]')).not.toBeNull();
    expect(root.querySelector<HTMLButtonElement>('[data-action="play"]')?.disabled).toBe(true);
    expect(gateway.startCalls).toEqual([{ playerId: expect.any(String), username: 'ren' }]);

    gateway.startQueue[0].resolve({ ranked: true, sessionId: 'session-1' });
    await flush();

    expect(controller.screen).toBe('game');
    expect(controller.currentRun?.phase).toBe('playing');
  });

  test('failed ranked start stays out of gameplay and retries without re-entering username', async () => {
    const gateway = new ControlledRankedGateway();
    const { root, controller } = setup(gateway);
    enterAndPlay(root, 'ren');

    gateway.startQueue[0].reject(new Error('offline'));
    await flush();

    expect(controller.screen).toBe('username');
    expect(controller.currentRun).toBeNull();
    expect(root.querySelector('[data-session-status="failed"]')).not.toBeNull();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('ranking');
    expect(root.querySelector<HTMLInputElement>('input[name="username"]')?.value).toBe('ren');

    click(root, '[data-action="play"]');
    expect(gateway.startCalls).toHaveLength(2);
    gateway.startQueue[1].resolve({ ranked: true, sessionId: 'session-2' });
    await flush();

    expect(controller.screen).toBe('game');
    expect(controller.currentRun?.phase).toBe('playing');
  });

  test('local gateway still starts unranked gameplay immediately', () => {
    const { root, controller } = setup(new LocalSessionGateway());
    enterAndPlay(root, 'local');

    expect(controller.screen).toBe('game');
    expect(controller.currentRun?.phase).toBe('playing');
  });

  test('game over submits the exact captured session and failed submission is retryable', async () => {
    const gateway = new ControlledRankedGateway();
    const { root, controller } = setup(gateway);
    enterAndPlay(root, 'ren');
    gateway.startQueue[0].resolve({ ranked: true, sessionId: 'captured-session' });
    await flush();

    const result = v2Result(20, 2, 4_000);
    forceGameOver(controller, result);

    expect(gateway.submitCalls[0]).toMatchObject({ sessionId: 'captured-session', result });
    expect(root.textContent).toContain('LENGTH');
    expect(root.textContent).toContain('20');
    expect(root.querySelector('[data-action="replay"]')).not.toBeNull();

    gateway.submitQueue[0].reject(new Error('network'));
    await flush();

    expect(root.querySelector('[data-action="retry-rank"]')).not.toBeNull();
    expect(root.querySelector('[data-action="replay"]')).not.toBeNull();
    expect(root.querySelector('[data-submission-status="failed"]')).not.toBeNull();

    click(root, '[data-action="retry-rank"]');
    expect(gateway.submitCalls[1]).toMatchObject({ sessionId: 'captured-session', result });
    gateway.submitQueue[1].resolve({ ranked: true, worldRank: 9 });
    await flush();

    expect(root.textContent).toContain('#9');
    expect(root.querySelector('[data-action="retry-rank"]')).toBeNull();
  });

  test('late start from attempt A cannot mutate attempt B', async () => {
    const gateway = new ControlledRankedGateway();
    const { root, controller } = setup(gateway);
    enterAndPlay(root, 'first');

    const internal = controller as unknown as { beginGame(username?: string): void };
    internal.beginGame('second');
    expect(gateway.startCalls).toHaveLength(2);

    gateway.startQueue[1].resolve({ ranked: true, sessionId: 'session-B' });
    await flush();
    expect(controller.screen).toBe('game');

    gateway.startQueue[0].resolve({ ranked: true, sessionId: 'session-A' });
    await flush();

    forceGameOver(controller, v2Result(12, 0, 0));
    expect(gateway.submitCalls[0].sessionId).toBe('session-B');
  });

  test('late result from run A cannot overwrite world rank for run B', async () => {
    const gateway = new ControlledRankedGateway();
    const { root, controller } = setup(gateway);
    enterAndPlay(root, 'ren');
    gateway.startQueue[0].resolve({ ranked: true, sessionId: 'session-A' });
    await flush();
    forceGameOver(controller, v2Result(12, 0, 0));

    click(root, '[data-action="replay"]');
    gateway.startQueue[1].resolve({ ranked: true, sessionId: 'session-B' });
    await flush();
    forceGameOver(controller, v2Result(16, 1, 1_000));
    expect(gateway.submitCalls[1].sessionId).toBe('session-B');

    gateway.submitQueue[0].resolve({ ranked: true, worldRank: 1 });
    await flush();
    expect(root.textContent).not.toContain('#1');

    gateway.submitQueue[1].resolve({ ranked: true, worldRank: 22 });
    await flush();
    expect(root.textContent).toContain('#22');
  });
});

describe('public leaderboard UI', () => {
  test('shows loading then renders duplicate/Unicode/untrusted usernames as safe text and marks own rank', async () => {
    const gateway = new ControlledRankedGateway();
    const { root, controller } = setup(gateway);
    await reachAcceptedGameOver(root, controller, gateway);

    click(root, '[data-action="rank"]');
    expect(controller.screen).toBe('rank');
    expect(root.querySelector('[data-leaderboard-state="loading"]')).not.toBeNull();
    expect(gateway.leaderboardCalls).toEqual([50]);
    expect(gateway.rankCalls).toHaveLength(1);

    const playerId = gateway.rankCalls[0];
    gateway.leaderboardQueue[0].resolve({
      entries: [
        { rank: 1, username: '<img src=x onerror=alert(1)>', maxLength: 40, durationMs: 4_000, acceptedAt: 1 },
        { rank: 2, username: 'same', maxLength: 32, durationMs: 5_000, acceptedAt: 2 },
        { rank: 3, username: 'same', maxLength: 28, durationMs: 5_500, acceptedAt: 3 },
        { rank: 4, username: 'João 龍', maxLength: 24, durationMs: 6_000, acceptedAt: 4 }
      ]
    });
    gateway.rankQueue[0].resolve({ rank: 2, username: 'same', maxLength: 32, durationMs: 5_000 });
    await flush();

    expect(root.querySelector('[data-leaderboard-state="ready"]')).not.toBeNull();
    expect(root.querySelectorAll('[data-leaderboard-row]')).toHaveLength(4);
    expect(root.querySelector('[data-leaderboard-row][data-self="true"]')?.textContent).toContain('same');
    expect(root.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(root.textContent).toContain('João 龍');
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('script')).toBeNull();
    expect(root.textContent).not.toContain(playerId);
  });

  test('renders a valid empty leaderboard state', async () => {
    const gateway = new ControlledRankedGateway();
    const { root, controller } = setup(gateway);
    await reachAcceptedGameOver(root, controller, gateway);

    click(root, '[data-action="rank"]');
    gateway.leaderboardQueue[0].resolve({ entries: [] });
    gateway.rankQueue[0].resolve(null);
    await flush();

    expect(root.querySelector('[data-leaderboard-state="empty"]')).not.toBeNull();
    expect(root.textContent?.toLowerCase()).toContain('no ranked runs');
  });

  test('shows a concise read error and BACK keeps replay available', async () => {
    const gateway = new ControlledRankedGateway();
    const { root, controller } = setup(gateway);
    await reachAcceptedGameOver(root, controller, gateway);

    click(root, '[data-action="rank"]');
    gateway.leaderboardQueue[0].reject(new Error('offline'));
    gateway.rankQueue[0].resolve(null);
    await flush();

    expect(root.querySelector('[data-leaderboard-state="error"]')).not.toBeNull();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('leaderboard');
    click(root, '[data-action="back"]');
    expect(controller.screen).toBe('game-over');
    expect(root.querySelector('[data-action="replay"]')).not.toBeNull();
  });

  test('late leaderboard response cannot overwrite the screen after BACK', async () => {
    const gateway = new ControlledRankedGateway();
    const { root, controller } = setup(gateway);
    await reachAcceptedGameOver(root, controller, gateway);

    click(root, '[data-action="rank"]');
    click(root, '[data-action="back"]');
    expect(controller.screen).toBe('game-over');

    gateway.leaderboardQueue[0].resolve({
      entries: [{ rank: 1, username: 'late', maxLength: 100, durationMs: 1, acceptedAt: 1 }]
    });
    gateway.rankQueue[0].resolve({ rank: 1, username: 'late', maxLength: 100, durationMs: 1 });
    await flush();

    expect(controller.screen).toBe('game-over');
    expect(root.textContent).not.toContain('late');
  });
});
