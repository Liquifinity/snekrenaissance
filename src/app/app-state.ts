import type { RunState } from '../game/run-state';

export type AppScreen = 'intro' | 'username' | 'game' | 'game-over' | 'complete' | 'best';

export type AppState = {
  screen: AppScreen;
  username: string;
  localBest: number;
  run: RunState | null;
};
