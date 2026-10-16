import type {
  ApiErrorEnvelope,
  LeaderboardEntry,
  LeaderboardResponse,
  PlayerRankResponse,
  StartGameResponse,
  SubmitResultResponse
} from '../shared/ranking-api';
import type { RunResult } from '../game/run-state';
import type { PlayerIdentity } from './identity';
import type { SessionGateway, SessionStart, SessionSubmission } from './session-gateway';

export class RankingApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;

  constructor(status: number, code: string, message: string, retryable: boolean) {
    super(message);
    this.name = 'RankingApiError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function malformed(): never {
  throw new Error('Malformed ranking API response.');
}

function asStartResponse(value: unknown): StartGameResponse {
  if (!isRecord(value) || typeof value.sessionId !== 'string' || !value.sessionId || !isInteger(value.startedAt)) {
    return malformed();
  }
  return { sessionId: value.sessionId, startedAt: value.startedAt };
}

function asSubmissionResponse(value: unknown): SubmitResultResponse {
  if (!isRecord(value) || value.accepted !== true || !isInteger(value.worldRank) || value.worldRank < 1) {
    return malformed();
  }
  return { accepted: true, worldRank: value.worldRank };
}

function asLeaderboardEntry(value: unknown): LeaderboardEntry {
  if (!isRecord(value)
    || !isInteger(value.rank) || value.rank < 1
    || typeof value.username !== 'string'
    || !isInteger(value.maxLength) || value.maxLength < 0
    || !isInteger(value.durationMs) || value.durationMs < 0
    || !isInteger(value.acceptedAt) || value.acceptedAt < 0) {
    return malformed();
  }
  return {
    rank: value.rank,
    username: value.username,
    maxLength: value.maxLength,
    durationMs: value.durationMs,
    acceptedAt: value.acceptedAt
  };
}

function asLeaderboardResponse(value: unknown): LeaderboardResponse {
  if (!isRecord(value) || !Array.isArray(value.entries)) return malformed();
  return { entries: value.entries.map(asLeaderboardEntry) };
}

function asPlayerRankResponse(value: unknown): PlayerRankResponse {
  if (!isRecord(value)
    || !isInteger(value.rank) || value.rank < 1
    || typeof value.username !== 'string'
    || !isInteger(value.maxLength) || value.maxLength < 0
    || !isInteger(value.durationMs) || value.durationMs < 0) {
    return malformed();
  }
  return {
    rank: value.rank,
    username: value.username,
    maxLength: value.maxLength,
    durationMs: value.durationMs
  };
}

function asErrorEnvelope(value: unknown): ApiErrorEnvelope | null {
  if (!isRecord(value) || !isRecord(value.error)) return null;
  const error = value.error;
  if (typeof error.code !== 'string'
    || typeof error.message !== 'string'
    || typeof error.retryable !== 'boolean') return null;
  return {
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable
    }
  };
}

export class HttpSessionGateway implements SessionGateway {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(baseUrl: string, fetchImpl: typeof fetch = fetch) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fetchImpl = ((input: RequestInfo | URL, init?: RequestInit) => (
      fetchImpl.call(globalThis, input, init)
    )) as typeof fetch;
  }

  /** The current HTTP API is the historical unversioned V1 validator. */
  supportsRuleset(_rulesetId: string): boolean {
    return false;
  }

  async startRun(identity: PlayerIdentity): Promise<SessionStart> {
    const response = await this.request('/api/games', {
      method: 'POST',
      body: JSON.stringify({ playerId: identity.playerId, username: identity.username })
    });
    const body = asStartResponse(response);
    return { ranked: true, sessionId: body.sessionId };
  }

  async submitResult(
    identity: PlayerIdentity,
    sessionId: string,
    result: RunResult
  ): Promise<SessionSubmission> {
    const response = await this.request(`/api/games/${encodeURIComponent(sessionId)}/result`, {
      method: 'POST',
      body: JSON.stringify({
        playerId: identity.playerId,
        username: identity.username,
        maxLength: result.maxLength,
        foodEaten: result.foodEaten,
        durationMs: result.durationMs
      })
    });
    const body = asSubmissionResponse(response);
    return { ranked: true, worldRank: body.worldRank };
  }

  async getLeaderboard(limit?: number): Promise<LeaderboardResponse> {
    const query = limit === undefined ? '' : `?limit=${encodeURIComponent(String(limit))}`;
    return asLeaderboardResponse(await this.request(`/api/leaderboard${query}`, { method: 'GET' }));
  }

  async getPlayerRank(playerId: string): Promise<PlayerRankResponse | null> {
    const response = await this.fetchImpl(this.url(`/api/player/${encodeURIComponent(playerId)}/rank`), {
      method: 'GET',
      headers: { accept: 'application/json' }
    });
    const body = await this.readResponse(response);
    if (response.status === 404) return null;
    if (!response.ok) throw this.apiError(response.status, body);
    return asPlayerRankResponse(body);
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    const headers = new Headers(init.headers);
    headers.set('accept', 'application/json');
    if (init.body !== undefined) headers.set('content-type', 'application/json');

    const response = await this.fetchImpl(this.url(path), { ...init, headers });
    const body = await this.readResponse(response);
    if (!response.ok) throw this.apiError(response.status, body);
    return body;
  }

  private async readResponse(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return malformed();
    }
  }

  private apiError(status: number, body: unknown): RankingApiError {
    const envelope = asErrorEnvelope(body);
    if (envelope) {
      return new RankingApiError(
        status,
        envelope.error.code,
        envelope.error.message,
        envelope.error.retryable
      );
    }
    return new RankingApiError(
      status,
      'HTTP_ERROR',
      'The ranking service returned an unexpected error response.',
      status >= 500
    );
  }
}
