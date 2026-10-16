export type StartGameRequest = {
  playerId: string;
  username: string;
};

export type StartGameResponse = {
  sessionId: string;
  startedAt: number;
};

export type SubmitResultRequest = {
  playerId: string;
  username: string;
  maxLength: number;
  foodEaten: number;
  durationMs: number;
};

export type SubmitResultResponse = {
  accepted: true;
  worldRank: number;
};

export type LeaderboardEntry = {
  rank: number;
  username: string;
  maxLength: number;
  durationMs: number;
  acceptedAt: number;
};

export type LeaderboardResponse = {
  entries: LeaderboardEntry[];
};

export type PlayerRankResponse = {
  rank: number;
  username: string;
  maxLength: number;
  durationMs: number;
};

export type ApiErrorEnvelope = {
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
};
