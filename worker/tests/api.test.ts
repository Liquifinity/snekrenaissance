import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { createTestHarness } from 'wrangler';

const server = createTestHarness({
  workers: [{ configPath: './wrangler.jsonc' }]
});

beforeAll(async () => {
  await server.listen();
});

afterEach(async () => {
  await server.reset();
});

afterAll(async () => {
  await server.close();
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
