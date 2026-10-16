import type { LeaderboardResponse, PlayerRankResponse } from '../shared/ranking-api';
import type { RunResult } from '../game/run-state';
import type { PlayerIdentity } from './identity';

export type SessionStart =
  | { ranked: false; sessionId: null }
  | { ranked: true; sessionId: string };

export type SessionSubmission =
  | { ranked: false; worldRank: null }
  | { ranked: true; worldRank: number };

export interface SessionGateway {
  supportsRuleset(rulesetId: string): boolean;
  startRun(identity: PlayerIdentity): Promise<SessionStart>;
  submitResult(
    identity: PlayerIdentity,
    sessionId: string,
    result: RunResult
  ): Promise<SessionSubmission>;
  getLeaderboard(limit?: number): Promise<LeaderboardResponse>;
  getPlayerRank(playerId: string): Promise<PlayerRankResponse | null>;
}

export class LocalSessionGateway implements SessionGateway {
  supportsRuleset(_rulesetId: string): boolean {
    return true;
  }

  async startRun(_identity: PlayerIdentity): Promise<SessionStart> {
    return { ranked: false, sessionId: null };
  }

  async submitResult(
    _identity: PlayerIdentity,
    _sessionId: string,
    _result: RunResult
  ): Promise<SessionSubmission> {
    return { ranked: false, worldRank: null };
  }

  async getLeaderboard(_limit?: number): Promise<LeaderboardResponse> {
    return { entries: [] };
  }

  async getPlayerRank(_playerId: string): Promise<PlayerRankResponse | null> {
    return null;
  }
}
