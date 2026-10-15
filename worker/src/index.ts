import type { WorkerEnv } from './env';
import { ApiError, errorResponse, internalErrorResponse, jsonResponse } from './errors';
import { routeRequest } from './routes';

function bindingsReady(env: WorkerEnv): boolean {
  return Boolean(env.DB && env.START_LIMITER && env.RESULT_LIMITER && env.READ_LIMITER);
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/api/health') {
      if (!bindingsReady(env)) {
        return jsonResponse({ ok: false }, 500);
      }
      return jsonResponse({ ok: true });
    }

    try {
      return await routeRequest(request, env);
    } catch (error) {
      if (error instanceof ApiError) {
        return errorResponse(error);
      }
      console.error('Unhandled ranking API error', error);
      return internalErrorResponse();
    }
  }
};
