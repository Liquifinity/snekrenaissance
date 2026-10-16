import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestHarness } from 'wrangler';

const server = createTestHarness({ workers: [{ configPath: './wrangler.jsonc' }] });

describe('worker harness', () => {
  beforeAll(async () => { await server.listen(); });
  afterAll(async () => { await server.close(); });

  it('worker boots with local bindings', async () => {
    const response = await server.fetch('/api/health');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
