export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export type PlayerIdentity = {
  playerId: string;
  username: string;
};

export const PLAYER_ID_KEY = 'snek.playerId';
export const USERNAME_KEY = 'snek.username';
export const LOCAL_BEST_KEY = 'snek.localBest';
export const V2_LOCAL_BEST_KEY = 'snek.localBest.pixelGridV2';
export const V2_1_LOCAL_BEST_KEY = 'snek.localBest.pixelGridV2_1';

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

function loadNonNegativeInteger(storage: StorageLike, key: string): number {
  const parsed = Number.parseInt(storage.getItem(key) ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function saveBest(storage: StorageLike, key: string, score: number): number {
  const safe = Math.max(0, Math.floor(score));
  const best = Math.max(loadNonNegativeInteger(storage, key), safe);
  storage.setItem(key, String(best));
  return best;
}

/** Historical V1 best. Kept intact for migration/history only. */
export function loadLocalBest(storage: StorageLike): number {
  return loadNonNegativeInteger(storage, LOCAL_BEST_KEY);
}

/** Historical V1 best. V2/V2.1 code must use ruleset-specific helpers. */
export function saveLocalBest(storage: StorageLike, length: number): number {
  return saveBest(storage, LOCAL_BEST_KEY, length);
}

/** Historical Pixel Flight Grid V2 best. Preserved unchanged. */
export function loadPixelGridV2Best(storage: StorageLike): number {
  return loadNonNegativeInteger(storage, V2_LOCAL_BEST_KEY);
}

/** Historical Pixel Flight Grid V2 best. V2.1 must not write here. */
export function savePixelGridV2Best(storage: StorageLike, score: number): number {
  return saveBest(storage, V2_LOCAL_BEST_KEY, score);
}

export function loadPixelGridV2_1Best(storage: StorageLike): number {
  return loadNonNegativeInteger(storage, V2_1_LOCAL_BEST_KEY);
}

export function savePixelGridV2_1Best(storage: StorageLike, score: number): number {
  return saveBest(storage, V2_1_LOCAL_BEST_KEY, score);
}
