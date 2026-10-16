import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createTestHarness } from 'wrangler';
import worker from '../src/index';
import type { WorkerEnv } from '../src/env';

const server = createTestHarness({
  workers: [{ configPath: './wrangler.jsonc' }]
});

beforeAll(async () => {
  await server.listen();
});

afterAll(async () => {
  await server.close();
});

describe('production browser CORS', () => {
  test('answers API preflight without credentials', async () => {
    const response = await server.fetch('/api/games', { method: 'OPTIONS' });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-methods')).toBe('GET, POST, OPTIONS');
    expect(response.headers.get('access-control-allow-headers')).toBe('Content-Type');
    expect(response.headers.get('access-control-allow-credentials')).toBeNull();
  });

  test('adds CORS to health, leaderboard and validation errors', async () => {
    await server.getWorker().applyD1Migrations('DB');

    const health = await server.fetch('/api/health');
    expect(health.status).toBe(200);
    expect(health.headers.get('access-control-allow-origin')).toBe('*');

    const leaderboard = await server.fetch('/api/leaderboard', {
      headers: { 'CF-Connecting-IP': '203.0.113.40' }
    });
    expect(leaderboard.status).toBe(200);
    expect(leaderboard.headers.get('access-control-allow-origin')).toBe('*');

    const invalid = await server.fetch('/api/games', {
      method: 'POST',
      headers: {
        'CF-Connecting-IP': '203.0.113.41',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ playerId: '../bad', username: 'ren' })
    });
    expect(invalid.status).toBe(400);
    expect(invalid.headers.get('access-control-allow-origin')).toBe('*');
  });

  test('adds CORS to unexpected internal errors', async () => {
    const response = await worker.fetch(
      new Request('https://example.test/api/leaderboard', {
        headers: { 'CF-Connecting-IP': '203.0.113.42' }
      }),
      {} as WorkerEnv
    );

    expect(response.status).toBe(500);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(await response.json()).toMatchObject({ error: { code: 'INTERNAL_ERROR' } });
  });
});
