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
    const response = await server.fetch('/api/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
