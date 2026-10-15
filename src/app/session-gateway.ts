import type { RunResult } from '../game/run-state';
import type { PlayerIdentity } from './identity';

export type SessionStart = {
  ranked: boolean;
  sessionId: string | null;
};

export type SessionSubmission = {
  ranked: boolean;
  worldRank: number | null;
};

export interface SessionGateway {
  startRun(identity: PlayerIdentity): Promise<SessionStart>;
  submitResult(identity: PlayerIdentity, result: RunResult): Promise<SessionSubmission>;
}

export class LocalSessionGateway implements SessionGateway {
  async startRun(_identity: PlayerIdentity): Promise<SessionStart> {
    return { ranked: false, sessionId: null };
  }

  async submitResult(_identity: PlayerIdentity, _result: RunResult): Promise<SessionSubmission> {
    return { ranked: false, worldRank: null };
  }
}
