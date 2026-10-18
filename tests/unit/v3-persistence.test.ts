import { describe, expect, it, vi } from 'vitest';
import { HttpSessionGateway } from '../../src/app/http-session-gateway';
import {
  LOCAL_BEST_KEY,
  V2_LOCAL_BEST_KEY,
  V2_1_LOCAL_BEST_KEY,
  V2_2_LOCAL_BEST_KEY,
  V3_LOCAL_BEST_KEY,
  loadSnekCoreV3Best,
  saveSnekCoreV3Best,
  type StorageLike
} from '../../src/app/identity';
import { LocalSessionGateway } from '../../src/app/session-gateway';
import { RULESET_ID } from '../../src/game/grid-config';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('SNEK CORE V3 persistence and ranking boundary', () => {
  it('stores V3 best only under its own key and preserves all historical bests byte-for-byte', () => {
    const storage = new MemoryStorage();
    storage.setItem(LOCAL_BEST_KEY, '0068');
    storage.setItem(V2_LOCAL_BEST_KEY, '0019');
    storage.setItem(V2_1_LOCAL_BEST_KEY, '0013');
    storage.setItem(V2_2_LOCAL_BEST_KEY, '0024');

    expect(saveSnekCoreV3Best(storage, 31)).toBe(31);
    expect(saveSnekCoreV3Best(storage, 18)).toBe(31);
    expect(loadSnekCoreV3Best(storage)).toBe(31);
    expect(storage.getItem(V3_LOCAL_BEST_KEY)).toBe('31');

    expect(storage.getItem(LOCAL_BEST_KEY)).toBe('0068');
    expect(storage.getItem(V2_LOCAL_BEST_KEY)).toBe('0019');
    expect(storage.getItem(V2_1_LOCAL_BEST_KEY)).toBe('0013');
    expect(storage.getItem(V2_2_LOCAL_BEST_KEY)).toBe('0024');
  });

  it('declares the V3 ruleset local-capable while the historical HTTP ranking API remains unsupported', () => {
    expect(RULESET_ID).toBe('snek-core-v3');
    expect(new LocalSessionGateway().supportsRuleset(RULESET_ID)).toBe(true);

    const fetchMock = vi.fn<typeof fetch>();
    expect(new HttpSessionGateway('/rank', fetchMock).supportsRuleset(RULESET_ID)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
