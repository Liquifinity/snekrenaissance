import { describe, expect, it } from 'vitest';
import {
  LOCAL_BEST_KEY,
  V2_LOCAL_BEST_KEY,
  V2_1_LOCAL_BEST_KEY,
  V2_2_LOCAL_BEST_KEY,
  V3_LOCAL_BEST_KEY,
  V4_LOCAL_BEST_KEY,
  loadSnekCoreV3Best,
  saveSnekCoreV3Best,
  type StorageLike
} from '../../src/app/identity';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('historical SNEK CORE V3 persistence', () => {
  it('keeps the V3 best isolated and never writes V4 or older namespaces', () => {
    const storage = new MemoryStorage();
    storage.setItem(LOCAL_BEST_KEY, '0068');
    storage.setItem(V2_LOCAL_BEST_KEY, '0019');
    storage.setItem(V2_1_LOCAL_BEST_KEY, '0013');
    storage.setItem(V2_2_LOCAL_BEST_KEY, '0024');
    storage.setItem(V4_LOCAL_BEST_KEY, '0042');

    expect(saveSnekCoreV3Best(storage, 31)).toBe(31);
    expect(saveSnekCoreV3Best(storage, 18)).toBe(31);
    expect(loadSnekCoreV3Best(storage)).toBe(31);
    expect(storage.getItem(V3_LOCAL_BEST_KEY)).toBe('31');
    expect(storage.getItem(V4_LOCAL_BEST_KEY)).toBe('0042');
    expect(storage.getItem(LOCAL_BEST_KEY)).toBe('0068');
    expect(storage.getItem(V2_LOCAL_BEST_KEY)).toBe('0019');
    expect(storage.getItem(V2_1_LOCAL_BEST_KEY)).toBe('0013');
    expect(storage.getItem(V2_2_LOCAL_BEST_KEY)).toBe('0024');
  });
});
