import type { RunState } from '../game/run-state';

export type AppScreen = 'intro' | 'username' | 'game' | 'game-over' | 'rank';

export type AppState = {
  screen: AppScreen;
  playerId: string;
  username: string;
  localBest: number;
  worldRank: number | null;
  ranked: boolean;
  run: RunState | null;
};
