export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export type PlayerIdentity = {
  playerId: string;
  username: string;
};

export const PLAYER_ID_KEY = 'snek.playerId';
export const USERNAME_KEY = 'snek.username';
export const LOCAL_BEST_KEY = 'snek.localBest';

function defaultId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `snek-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreatePlayerId(
  storage: StorageLike = localStorage,
  createId: () => string = defaultId
): string {
  const existing = storage.getItem(PLAYER_ID_KEY)?.trim();
  if (existing) return existing;

  const created = createId().trim();
  if (!created) throw new Error('Player ID generator returned an empty value.');
  storage.setItem(PLAYER_ID_KEY, created);
  return created;
}

export function saveUsername(storage: StorageLike, username: string): void {
  storage.setItem(USERNAME_KEY, username.trim());
}

export function loadUsername(storage: StorageLike): string {
  return storage.getItem(USERNAME_KEY)?.trim() ?? '';
}

export function loadLocalBest(storage: StorageLike): number {
  const parsed = Number.parseInt(storage.getItem(LOCAL_BEST_KEY) ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function saveLocalBest(storage: StorageLike, length: number): number {
  const safe = Math.max(0, Math.floor(length));
  const best = Math.max(loadLocalBest(storage), safe);
  storage.setItem(LOCAL_BEST_KEY, String(best));
  return best;
}
