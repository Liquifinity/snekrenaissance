import { describe, expect, test } from 'vitest';

type FetchCall = { url: string; method: string };

async function loadSmoke() {
  return import('../../scripts/smoke-production.mjs');
}

function response(body: BodyInit | null, init: ResponseInit = {}): Response {
  return new Response(body, init);
}

function createFetch(options: { bundle?: string; healthOk?: boolean; cors?: string } = {}) {
  const workerUrl = 'https://snekrenaissance-api.example.workers.dev';
  const pagesUrl = 'https://snekrenaissance.pages.dev';
  const calls: FetchCall[] = [];
  const bundle = options.bundle ?? `console.log("just because ChatGPT", "didnt complete my image.", "${workerUrl}")`;
  const healthOk = options.healthOk ?? true;
  const cors = options.cors ?? '*';

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
    calls.push({ url, method });

    if (url === `${workerUrl}/api/health`) {
      return response(JSON.stringify({ ok: healthOk }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': cors }
      });
    }
    if (url === `${workerUrl}/api/leaderboard`) {
      return response(JSON.stringify({ entries: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': cors }
      });
    }
    if (url === `${workerUrl}/api/games` && method === 'OPTIONS') {
      return response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': cors,
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'Content-Type'
        }
      });
    }
    if (url === pagesUrl || url === `${pagesUrl}/`) {
      return response('<!doctype html><main id="app"></main><script type="module" crossorigin src="/assets/index-test.js"></script>', {
        status: 200,
        headers: { 'content-type': 'text/html' }
      });
    }
    if (url === `${pagesUrl}/assets/index-test.js`) {
      return response(bundle, { status: 200, headers: { 'content-type': 'application/javascript' } });
    }
    return response('not found', { status: 404 });
  };

  return { workerUrl, pagesUrl, fetchImpl, calls };
}

describe('production smoke verifier', () => {
  test('accepts a healthy ranked Pages + Worker release', async () => {
    const { smokeProduction } = await loadSmoke();
    const fixture = createFetch();

    const result = await smokeProduction({
      workerUrl: fixture.workerUrl,
      pagesUrl: fixture.pagesUrl,
      fetchImpl: fixture.fetchImpl
    });

    expect(result).toEqual({ workerUrl: fixture.workerUrl, pagesUrl: fixture.pagesUrl, ranked: true });
    expect(fixture.calls).toContainEqual({ url: `${fixture.workerUrl}/api/games`, method: 'OPTIONS' });
  });

  test('rejects unhealthy Worker responses or missing CORS', async () => {
    const { smokeProduction } = await loadSmoke();

    const unhealthy = createFetch({ healthOk: false });
    await expect(smokeProduction({
      workerUrl: unhealthy.workerUrl,
      pagesUrl: unhealthy.pagesUrl,
      fetchImpl: unhealthy.fetchImpl
    })).rejects.toThrow();

    const noCors = createFetch({ cors: 'https://wrong.example' });
    await expect(smokeProduction({
      workerUrl: noCors.workerUrl,
      pagesUrl: noCors.pagesUrl,
      fetchImpl: noCors.fetchImpl
    })).rejects.toThrow(/CORS/i);
  });

  test('rejects a frontend bundle that silently falls back to unranked', async () => {
    const { smokeProduction } = await loadSmoke();
    const fixture = createFetch({
      bundle: 'console.log("just because ChatGPT", "didnt complete my image.")'
    });

    await expect(smokeProduction({
      workerUrl: fixture.workerUrl,
      pagesUrl: fixture.pagesUrl,
      fetchImpl: fixture.fetchImpl
    })).rejects.toThrow(/Worker origin/i);
  });

  test('rejects a frontend bundle without the canonical meme copy', async () => {
    const { smokeProduction } = await loadSmoke();
    const fixture = createFetch({
      bundle: 'console.log("https://snekrenaissance-api.example.workers.dev")'
    });

    await expect(smokeProduction({
      workerUrl: fixture.workerUrl,
      pagesUrl: fixture.pagesUrl,
      fetchImpl: fixture.fetchImpl
    })).rejects.toThrow(/canonical meme/i);
  });
});
