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
export const V2_2_LOCAL_BEST_KEY = 'snek.localBest.pixelGridV2_2';
export const V3_LOCAL_BEST_KEY = 'snek.localBest.coreV3';
export const V4_LOCAL_BEST_KEY = 'snek.localBest.coreV4';
export const V5_LOCAL_BEST_KEY = 'snek.localBest.coreV5';

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

/** Historical V1 best. Newer rulesets must not write this key. */
export function saveLocalBest(storage: StorageLike, length: number): number {
  return saveBest(storage, LOCAL_BEST_KEY, length);
}

/** Historical Pixel Flight Grid V2 best. */
export function loadPixelGridV2Best(storage: StorageLike): number {
  return loadNonNegativeInteger(storage, V2_LOCAL_BEST_KEY);
}

/** Historical Pixel Flight Grid V2 best. */
export function savePixelGridV2Best(storage: StorageLike, score: number): number {
  return saveBest(storage, V2_LOCAL_BEST_KEY, score);
}

/** Historical Pixel Flight Grid V2.1 best. */
export function loadPixelGridV2_1Best(storage: StorageLike): number {
  return loadNonNegativeInteger(storage, V2_1_LOCAL_BEST_KEY);
}

/** Historical Pixel Flight Grid V2.1 best. V2.2 code must use savePixelGridV2_2Best(). */
export function savePixelGridV2_1Best(storage: StorageLike, score: number): number {
  return saveBest(storage, V2_1_LOCAL_BEST_KEY, score);
}

/** Historical Pixel Flight Grid V2.2 best. */
export function loadPixelGridV2_2Best(storage: StorageLike): number {
  return loadNonNegativeInteger(storage, V2_2_LOCAL_BEST_KEY);
}

/** Historical Pixel Flight Grid V2.2 best. V3+ code must not write this key. */
export function savePixelGridV2_2Best(storage: StorageLike, score: number): number {
  return saveBest(storage, V2_2_LOCAL_BEST_KEY, score);
}

/** Historical SNEK CORE V3 best. */
export function loadSnekCoreV3Best(storage: StorageLike): number {
  return loadNonNegativeInteger(storage, V3_LOCAL_BEST_KEY);
}

/** Historical SNEK CORE V3 best. V4+ code must not write this key. */
export function saveSnekCoreV3Best(storage: StorageLike, score: number): number {
  return saveBest(storage, V3_LOCAL_BEST_KEY, score);
}

/** Historical SNEK CORE V4 best. */
export function loadSnekCoreV4Best(storage: StorageLike): number {
  return loadNonNegativeInteger(storage, V4_LOCAL_BEST_KEY);
}

/** Historical SNEK CORE V4 best. V5+ code must not write this key. */
export function saveSnekCoreV4Best(storage: StorageLike, score: number): number {
  return saveBest(storage, V4_LOCAL_BEST_KEY, score);
}

export function loadSnekCoreV5Best(storage: StorageLike): number {
  return loadNonNegativeInteger(storage, V5_LOCAL_BEST_KEY);
}

export function saveSnekCoreV5Best(storage: StorageLike, score: number): number {
  return saveBest(storage, V5_LOCAL_BEST_KEY, score);
}
