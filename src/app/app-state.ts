import type { RunState } from '../game/run-state';

export type AppScreen = 'intro' | 'username' | 'game' | 'game-over' | 'rank';
export type SessionStatus = 'idle' | 'starting' | 'ranked' | 'unranked' | 'failed';
export type SubmissionStatus = 'idle' | 'submitting' | 'accepted' | 'failed';

export type AppState = {
  screen: AppScreen;
  playerId: string;
  username: string;
  localBest: number;
  worldRank: number | null;
  ranked: boolean;
  activeSessionId: string | null;
  sessionStatus: SessionStatus;
  submissionStatus: SubmissionStatus;
  submissionError: string | null;
  run: RunState | null;
};
