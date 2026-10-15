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
      id: 'game-1',
      playerId: 'player-1',
      startedAt: 1_100,
      finalizedAt: null,
      status: 'started'
    });
  });

  test('finalizes one accepted score atomically per game', async () => {
    const database = await db();
    await upsertPlayer(database, 'player-1', 'ren', 1_000);
    await createGame(database, 'game-1', 'player-1', 1_100);

    const first = await finalizeAcceptedScore(database, {
      gameId: 'game-1',
      playerId: 'player-1',
      username: 'ren',
      maxLength: 16,
      foodEaten: 1,
      durationMs: 2_000,
      acceptedAt: 3_000
    });

    expect(first.gameId).toBe('game-1');
    expect((await getGame(database, 'game-1'))?.status).toBe('accepted');
    expect((await getGame(database, 'game-1'))?.finalizedAt).toBe(3_000);
    expect((await getScoreByGame(database, 'game-1'))?.maxLength).toBe(16);

    await expect(finalizeAcceptedScore(database, {
      gameId: 'game-1',
      playerId: 'player-1',
      username: 'ren',
      maxLength: 20,
      foodEaten: 2,
      durationMs: 4_000,
      acceptedAt: 5_000
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
      'idx_scores_global_rank',
      'idx_scores_player_best'
    ]);

    const migrations = await database.prepare(
      'SELECT COUNT(*) AS count FROM d1_migrations'
    ).first<{ count: number }>();
    expect(migrations?.count).toBe(1);
  });
});
