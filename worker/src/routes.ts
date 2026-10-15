import type {
  StartGameResponse,
  SubmitResultRequest,
  SubmitResultResponse
} from '../../src/shared/ranking-api';
import type { D1Database, RateLimitBinding, WorkerEnv } from './env';
import { ApiError, jsonResponse } from './errors';
import {
  createGame,
  finalizeAcceptedScore,
  getGame,
  getScoreByGame,
  type ScoreRecord,
  upsertPlayer
} from './repository';
import {
  validatePlayerId,
  validateResultRequest,
  validateSessionAge,
  validateStartRequest
} from './validation';

export type RankPlayer = (db: D1Database, playerId: string) => Promise<number | null>;

export type RouteDependencies = {
  now?: () => number;
  uuid?: () => string;
  rankPlayer?: RankPlayer;
};

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Request body is not valid JSON.', false);
  }
}

function requestIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP')?.trim() || 'unknown';
}

async function enforceRateLimit(
  limiter: RateLimitBinding,
  key: string
): Promise<void> {
  const result = await limiter.limit({ key });
  if (!result.success) {
    throw new ApiError(429, 'RATE_LIMITED', 'Too many requests. Try again shortly.', true);
  }
}

function validationError(code: 'INVALID_REQUEST' | 'INVALID_RESULT', error: unknown): ApiError {
  return new ApiError(
    400,
    code,
    error instanceof Error ? error.message : 'Request validation failed.',
    false
  );
}

function sameAcceptedResult(score: ScoreRecord, request: SubmitResultRequest): boolean {
  return score.playerId === request.playerId
    && score.username === request.username
    && score.maxLength === request.maxLength
    && score.foodEaten === request.foodEaten
    && score.durationMs === request.durationMs;
}

async function acceptedResponse(
  env: WorkerEnv,
  playerId: string,
  rankPlayer: RankPlayer
): Promise<Response> {
  const worldRank = await rankPlayer(env.DB, playerId) ?? 1;
  const body: SubmitResultResponse = { accepted: true, worldRank };
  return jsonResponse(body, 200);
}

async function startGame(
  request: Request,
  env: WorkerEnv,
  deps: Required<RouteDependencies>
): Promise<Response> {
  const raw = await readJson(request);
  let body;
  try {
    body = validateStartRequest(raw);
  } catch (error) {
    throw validationError('INVALID_REQUEST', error);
  }

  await enforceRateLimit(env.START_LIMITER, `${requestIp(request)}:${body.playerId}`);

  const startedAt = deps.now();
  const sessionId = deps.uuid();
  await upsertPlayer(env.DB, body.playerId, body.username, startedAt);
  await createGame(env.DB, sessionId, body.playerId, startedAt);

  const response: StartGameResponse = { sessionId, startedAt };
  return jsonResponse(response, 201);
}

async function submitResult(
  request: Request,
  env: WorkerEnv,
  sessionId: string,
  deps: Required<RouteDependencies>
): Promise<Response> {
  const raw = await readJson(request);
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ApiError(400, 'INVALID_RESULT', 'Request body must be an object.', false);
  }

  let playerId: string;
  try {
    playerId = validatePlayerId((raw as Record<string, unknown>).playerId);
  } catch (error) {
    throw validationError('INVALID_RESULT', error);
  }

  await enforceRateLimit(env.RESULT_LIMITER, `${requestIp(request)}:${playerId}`);

  const game = await getGame(env.DB, sessionId);
  if (!game) {
    throw new ApiError(404, 'SESSION_NOT_FOUND', 'Game session was not found.', false);
  }
  if (game.playerId !== playerId) {
    throw new ApiError(409, 'SESSION_OWNER_MISMATCH', 'Game session does not belong to this player.', false);
  }

  const now = deps.now();
  const serverElapsedMs = now - game.startedAt;
  let result: SubmitResultRequest;
  try {
    result = validateResultRequest(raw, serverElapsedMs);
  } catch (error) {
    throw validationError('INVALID_RESULT', error);
  }

  const existing = await getScoreByGame(env.DB, sessionId);
  if (existing) {
    if (!sameAcceptedResult(existing, result)) {
      throw new ApiError(409, 'SESSION_FINALIZED', 'Game session was already finalized with a different result.', false);
    }
    return acceptedResponse(env, playerId, deps.rankPlayer);
  }

  if (game.status !== 'started') {
    throw new ApiError(409, 'SESSION_FINALIZED', 'Game session was already finalized.', false);
  }

  try {
    validateSessionAge(serverElapsedMs);
  } catch {
    throw new ApiError(409, 'SESSION_EXPIRED', 'Game session has expired.', false);
  }

  await upsertPlayer(env.DB, result.playerId, result.username, now);

  try {
    await finalizeAcceptedScore(env.DB, {
      gameId: sessionId,
      playerId: result.playerId,
      username: result.username,
      maxLength: result.maxLength,
      foodEaten: result.foodEaten,
      durationMs: result.durationMs,
      acceptedAt: now
    });
  } catch (error) {
    const raced = await getScoreByGame(env.DB, sessionId);
    if (raced) {
      if (sameAcceptedResult(raced, result)) {
        return acceptedResponse(env, playerId, deps.rankPlayer);
      }
      throw new ApiError(409, 'SESSION_FINALIZED', 'Game session was already finalized with a different result.', false);
    }
    throw error;
  }

  return acceptedResponse(env, playerId, deps.rankPlayer);
}

export async function routeRequest(
  request: Request,
  env: WorkerEnv,
  dependencies: RouteDependencies = {}
): Promise<Response> {
  const deps: Required<RouteDependencies> = {
    now: dependencies.now ?? (() => Date.now()),
    uuid: dependencies.uuid ?? (() => crypto.randomUUID()),
    rankPlayer: dependencies.rankPlayer ?? (async () => 1)
  };

  const url = new URL(request.url);

  if (request.method === 'POST' && url.pathname === '/api/games') {
    return startGame(request, env, deps);
  }

  const resultMatch = /^\/api\/games\/([^/]+)\/result$/.exec(url.pathname);
  if (request.method === 'POST' && resultMatch) {
    return submitResult(request, env, decodeURIComponent(resultMatch[1]), deps);
  }

  throw new ApiError(404, 'NOT_FOUND', 'API route was not found.', false);
}
