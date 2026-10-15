import type { WorkerEnv } from './env';

function bindingsReady(env: WorkerEnv): boolean {
  return Boolean(env.DB && env.START_LIMITER && env.RESULT_LIMITER && env.READ_LIMITER);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/api/health') {
      if (!bindingsReady(env)) {
        return json({ ok: false }, 500);
      }
      return json({ ok: true });
    }

    return json({ error: 'not found' }, 404);
  }
};
