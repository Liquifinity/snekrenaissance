import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { createTestHarness } from 'wrangler';
import type { D1Database } from '../src/env';
import {
  createGame,
  finalizeAcceptedScore,
  getGame,
  getScoreByGame,
  upsertPlayer
} from '../src/repository';

const server = createTestHarness({
  workers: [{ configPath: './wrangler.jsonc' }]
});
const CLIENT_IP = '203.0.113.10';

beforeAll(async () => {
  await server.listen();
});

beforeEach(async () => {
  await server.getWorker().applyD1Migrations('DB');
});

afterEach(async () => {
  await server.reset();
});

afterAll(async () => {
  await server.close();
});

async function db(): Promise<D1Database> {
  const env = await server.getWorker().getEnv() as Record<string, unknown>;
  return env.DB as D1Database;
}

async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('CF-Connecting-IP', CLIENT_IP);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  return server.fetch(path, { ...init, headers });
}

async function startGame(playerId = 'player-1', username = 'ren'): Promise<{ sessionId: string; startedAt: number }> {
  const response = await api('/api/games', {
    method: 'POST',
    body: JSON.stringify({ playerId, username })
  });
  expect(response.status).toBe(201);
  return response.json() as Promise<{ sessionId: string; startedAt: number }>;
}

const zeroFoodResult = (playerId = 'player-1', username = 'ren') => ({
  playerId,
  username,
  maxLength: 12,
  foodEaten: 0,
  durationMs: 0
});

describe('Worker harness', () => {
  test('worker boots with local bindings', async () => {
    const env = await server.getWorker().getEnv() as Record<string, unknown>;
    expect(env.DB).toBeTruthy();
    expect(env.START_LIMITER).toBeTruthy();
    expect(env.RESULT_LIMITER).toBeTruthy();
    expect(env.READ_LIMITER).toBeTruthy();

    const response = await server.fetch('/api/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});

describe('D1 leaderboard repository', () => {
  test('upserts players without changing created_at', async () => {
    const database = await db();
    await upsertPlayer(database, 'player-1', 'first', 1_000);
    await upsertPlayer(database, 'player-1', 'second', 2_000);

    const row = await database.prepare(
      'SELECT username, created_at, updated_at FROM players WHERE id = ?'
    ).bind('player-1').first<{ username: string; created_at: number; updated_at: number }>();

    expect(row).toEqual({ username: 'second', created_at: 1_000, updated_at: 2_000 });
  });

  test('creates games in started state', async () => {
    const database = await db();
    await upsertPlayer(database, 'player-1', 'ren', 1_000);
    await createGame(database, 'game-1', 'player-1', 1_100);

    expect(await getGame(database, 'game-1')).toMatchObject({
      id: 'game-1', playerId: 'player-1', startedAt: 1_100, finalizedAt: null, status: 'started'
    });
  });

  test('finalizes one accepted score atomically per game', async () => {
    const database = await db();
    await upsertPlayer(database, 'player-1', 'ren', 1_000);
    await createGame(database, 'game-1', 'player-1', 1_100);

    const first = await finalizeAcceptedScore(database, {
      gameId: 'game-1', playerId: 'player-1', username: 'ren', maxLength: 16,
      foodEaten: 1, durationMs: 2_000, acceptedAt: 3_000
    });
    expect(first.gameId).toBe('game-1');
    expect((await getGame(database, 'game-1'))?.status).toBe('accepted');
    expect((await getGame(database, 'game-1'))?.finalizedAt).toBe(3_000);
    expect((await getScoreByGame(database, 'game-1'))?.maxLength).toBe(16);

    await expect(finalizeAcceptedScore(database, {
      gameId: 'game-1', playerId: 'player-1', username: 'ren', maxLength: 20,
      foodEaten: 2, durationMs: 4_000, acceptedAt: 5_000
    })).rejects.toThrow();

    const count = await database.prepare(
      'SELECT COUNT(*) AS count FROM scores WHERE game_id = ?'
    ).bind('game-1').first<{ count: number }>();
    expect(count?.count).toBe(1);
  });

  test('creates canonical ranking indexes and tracks migration once', async () => {
    const database = await db();
    await server.getWorker().applyD1Migrations('DB');
    const indexes = await database.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name IN ('idx_scores_player_best', 'idx_scores_global_rank') ORDER BY name"
    ).all<{ name: string }>();
    expect(indexes.results?.map((row) => row.name)).toEqual([
      'idx_scores_global_rank', 'idx_scores_player_best'
    ]);
    const migrations = await database.prepare('SELECT COUNT(*) AS count FROM d1_migrations')
      .first<{ count: number }>();
    expect(migrations?.count).toBe(1);
  });
});

describe('ranked session HTTP API', () => {
  test('starts a ranked session with a server UUID and timestamp', async () => {
    const started = await startGame();
    expect(started.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(Number.isInteger(started.startedAt)).toBe(true);
    expect((await getGame(await db(), started.sessionId))?.playerId).toBe('player-1');
  });

  test('returns stable 400 envelope for invalid identity and malformed JSON', async () => {
    const invalid = await api('/api/games', {
      method: 'POST',
      body: JSON.stringify({ playerId: '../bad', username: 'ren' })
    });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ error: { code: 'INVALID_REQUEST', retryable: false } });

    const malformed = await api('/api/games', { method: 'POST', body: '{' });
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({
      error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON.', retryable: false }
    });
  });

  test('returns 404 for unknown result session and hides owner mismatch behind 409', async () => {
    const unknown = await api('/api/games/00000000-0000-4000-8000-000000000000/result', {
      method: 'POST', body: JSON.stringify(zeroFoodResult())
    });
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toMatchObject({ error: { code: 'SESSION_NOT_FOUND' } });

    const { sessionId } = await startGame('player-1', 'ren');
    const mismatch = await api(`/api/games/${sessionId}/result`, {
      method: 'POST', body: JSON.stringify(zeroFoodResult('player-2', 'ren'))
    });
    expect(mismatch.status).toBe(409);
    expect(await mismatch.json()).toMatchObject({ error: { code: 'SESSION_OWNER_MISMATCH' } });
  });

  test('rejects impossible growth without finalizing the session', async () => {
    const { sessionId } = await startGame();
    const response = await api(`/api/games/${sessionId}/result`, {
      method: 'POST', body: JSON.stringify({ ...zeroFoodResult(), maxLength: 13 })
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'INVALID_RESULT' } });
    expect((await getGame(await db(), sessionId))?.status).toBe('started');
    expect(await getScoreByGame(await db(), sessionId)).toBeNull();
  });

  test('rejects expired sessions without accepting a score', async () => {
    const { sessionId } = await startGame();
    const database = await db();
    await database.prepare('UPDATE games SET started_at = ? WHERE id = ?')
      .bind(Date.now() - (6 * 60 * 60 * 1_000 + 1_000), sessionId).run();

    const response = await api(`/api/games/${sessionId}/result`, {
      method: 'POST', body: JSON.stringify(zeroFoodResult())
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: 'SESSION_EXPIRED' } });
    expect(await getScoreByGame(database, sessionId)).toBeNull();
  });

  test('accepts once, retries identical result idempotently, and conflicts on changed payload', async () => {
    const { sessionId } = await startGame();
    const path = `/api/games/${sessionId}/result`;
    const payload = zeroFoodResult();

    const first = await api(path, { method: 'POST', body: JSON.stringify(payload) });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ accepted: true, worldRank: 1 });

    const retry = await api(path, { method: 'POST', body: JSON.stringify(payload) });
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ accepted: true, worldRank: 1 });

    const conflict = await api(path, {
      method: 'POST',
      body: JSON.stringify({ ...payload, username: 'changed' })
    });
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({ error: { code: 'SESSION_FINALIZED' } });

    const count = await (await db()).prepare('SELECT COUNT(*) AS count FROM scores WHERE game_id = ?')
      .bind(sessionId).first<{ count: number }>();
    expect(count?.count).toBe(1);
  });

  test('enforces start rate limit at 20 calls per minute for IP + player', async () => {
    for (let index = 0; index < 20; index += 1) {
      const response = await api('/api/games', {
        method: 'POST', body: JSON.stringify({ playerId: 'rate-player', username: 'ren' })
      });
      expect(response.status).toBe(201);
    }
    const blocked = await api('/api/games', {
      method: 'POST', body: JSON.stringify({ playerId: 'rate-player', username: 'ren' })
    });
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toMatchObject({ error: { code: 'RATE_LIMITED', retryable: true } });
  }, 20_000);

  test('enforces result rate limit at 30 calls per minute for IP + player', async () => {
    const { sessionId } = await startGame('result-rate-player', 'ren');
    const path = `/api/games/${sessionId}/result`;
    const payload = zeroFoodResult('result-rate-player', 'ren');
    for (let index = 0; index < 30; index += 1) {
      const response = await api(path, { method: 'POST', body: JSON.stringify(payload) });
      expect(response.status).toBe(200);
    }
    const blocked = await api(path, { method: 'POST', body: JSON.stringify(payload) });
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toMatchObject({ error: { code: 'RATE_LIMITED', retryable: true } });
  }, 20_000);
});
