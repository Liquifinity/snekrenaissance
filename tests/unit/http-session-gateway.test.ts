import { describe, expect, test, vi } from 'vitest';
import { HttpSessionGateway } from '../../src/app/http-session-gateway';
import type { PlayerIdentity } from '../../src/app/identity';
import type { RunResult } from '../../src/game/run-state';

const identity: PlayerIdentity = { playerId: 'player/with space', username: 'Ren <b>ato</b>' };
const result: RunResult = {
  rulesetId: 'pixel-flight-grid-v2',
  score: 2,
  foodsCollected: 2,
  length: 20,
  maxLength: 20,
  foodEaten: 2,
  durationMs: 4_000
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

describe('HttpSessionGateway', () => {
  test('invokes fetch with the global receiver required by browser-native implementations', async () => {
    const fetchWithReceiver = function (this: typeof globalThis): Promise<Response> {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
      return Promise.resolve(jsonResponse({ sessionId: 'session-1', startedAt: 123 }, 201));
    } as typeof fetch;
    const gateway = new HttpSessionGateway('/rank', fetchWithReceiver);

    await expect(gateway.startRun({ playerId: 'player-1', username: 'ren' })).resolves.toEqual({
      ranked: true,
      sessionId: 'session-1'
    });
  });

  test('starts a run with POST JSON and normalizes the base URL', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      sessionId: 'session-1',
      startedAt: 123
    }, 201));
    const gateway = new HttpSessionGateway('https://rank.example///', fetchMock);

    await expect(gateway.startRun({ playerId: 'player-1', username: 'Rén' })).resolves.toEqual({
      ranked: true,
      sessionId: 'session-1'
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://rank.example/api/games');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ playerId: 'player-1', username: 'Rén' });
  });

  test('submits with the explicit session id and never derives it from mutable gateway state', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ accepted: true, worldRank: 7 }));
    const gateway = new HttpSessionGateway('', fetchMock);

    await expect(gateway.submitResult(
      { playerId: 'player-1', username: 'ren' },
      'session A/1',
      result
    )).resolves.toEqual({ ranked: true, worldRank: 7 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/games/session%20A%2F1/result');
    expect(JSON.parse(String(init?.body))).toEqual({
      playerId: 'player-1',
      username: 'ren',
      maxLength: 20,
      foodEaten: 2,
      durationMs: 4_000
    });
  });

  test('maps leaderboard and encoded player-rank GET requests', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({
        entries: [{ rank: 1, username: 'A', maxLength: 40, durationMs: 5_000, acceptedAt: 10 }]
      }))
      .mockResolvedValueOnce(jsonResponse({ rank: 9, username: 'Ren', maxLength: 24, durationMs: 8_000 }));
    const gateway = new HttpSessionGateway('/rank-api/', fetchMock);

    await expect(gateway.getLeaderboard(25)).resolves.toEqual({
      entries: [{ rank: 1, username: 'A', maxLength: 40, durationMs: 5_000, acceptedAt: 10 }]
    });
    await expect(gateway.getPlayerRank(identity.playerId)).resolves.toEqual({
      rank: 9, username: 'Ren', maxLength: 24, durationMs: 8_000
    });

    expect(fetchMock.mock.calls[0][0]).toBe('/rank-api/api/leaderboard?limit=25');
    expect(fetchMock.mock.calls[1][0]).toBe('/rank-api/api/player/player%2Fwith%20space/rank');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');
    expect(fetchMock.mock.calls[1][1]?.method).toBe('GET');
  });

  test('maps a 404 player rank to null', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      error: { code: 'PLAYER_NOT_RANKED', message: 'not ranked', retryable: false }
    }, 404));
    const gateway = new HttpSessionGateway('', fetchMock);

    await expect(gateway.getPlayerRank('player-1')).resolves.toBeNull();
  });

  test('surfaces structured retryable API errors', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      error: { code: 'RATE_LIMITED', message: 'slow down', retryable: true }
    }, 429));
    const gateway = new HttpSessionGateway('', fetchMock);

    await expect(gateway.startRun({ playerId: 'player-1', username: 'ren' }))
      .rejects.toMatchObject({
        name: 'RankingApiError',
        status: 429,
        code: 'RATE_LIMITED',
        retryable: true,
        message: 'slow down'
      });
  });

  test('rejects malformed success JSON instead of inventing ranked data', async () => {
    const malformedStart = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ startedAt: 1 }, 201));
    await expect(new HttpSessionGateway('', malformedStart).startRun({ playerId: 'p', username: 'ren' }))
      .rejects.toThrow('Malformed ranking API response');

    const malformedRank = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ rank: 'first' }));
    await expect(new HttpSessionGateway('', malformedRank).getPlayerRank('p'))
      .rejects.toThrow('Malformed ranking API response');
  });

  test('keeps usernames in JSON bodies and only URL-encodes playerId', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ sessionId: 's', startedAt: 1 }, 201))
      .mockResolvedValueOnce(jsonResponse({ rank: 1, username: identity.username, maxLength: 12, durationMs: 0 }));
    const gateway = new HttpSessionGateway('', fetchMock);

    await gateway.startRun(identity);
    await gateway.getPlayerRank(identity.playerId);

    expect(String(fetchMock.mock.calls[0][0])).not.toContain(identity.username);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).username).toBe(identity.username);
    expect(fetchMock.mock.calls[1][0]).toBe('/api/player/player%2Fwith%20space/rank');
  });
});
