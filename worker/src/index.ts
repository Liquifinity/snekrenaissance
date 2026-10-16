import { preflightResponse, withCors } from './cors';
import type { WorkerEnv } from './env';
import { ApiError, errorResponse, internalErrorResponse, jsonResponse } from './errors';
import { routeRequest } from './routes';

function bindingsReady(env: WorkerEnv): boolean {
  return Boolean(env.DB && env.START_LIMITER && env.RESULT_LIMITER && env.READ_LIMITER);
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return preflightResponse();
    }

    if (request.method === 'GET' && url.pathname === '/api/health') {
      if (!bindingsReady(env)) {
        return withCors(jsonResponse({ ok: false }, 500));
      }
      return withCors(jsonResponse({ ok: true }));
    }

    try {
      return withCors(await routeRequest(request, env));
    } catch (error) {
      if (error instanceof ApiError) {
        return withCors(errorResponse(error));
      }
      console.error('Unhandled ranking API error', error);
      return withCors(internalErrorResponse());
    }
  }
};
