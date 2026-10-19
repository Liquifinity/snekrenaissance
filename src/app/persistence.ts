export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export const USERNAME_KEY = 'snek.username';
export const LOCAL_BEST_KEY = 'snek.localBest.coreV5';

export function loadUsername(storage: StorageLike): string {
  return storage.getItem(USERNAME_KEY)?.trim() ?? '';
}

export function saveUsername(storage: StorageLike, username: string): void {
  storage.setItem(USERNAME_KEY, username.trim());
}

export function loadLocalBest(storage: StorageLike): number {
  const parsed = Number.parseInt(storage.getItem(LOCAL_BEST_KEY) ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function saveLocalBest(storage: StorageLike, score: number): number {
  const safeScore = Math.max(0, Math.floor(score));
  const best = Math.max(loadLocalBest(storage), safeScore);
  storage.setItem(LOCAL_BEST_KEY, String(best));
  return best;
}
