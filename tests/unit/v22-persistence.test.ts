import { describe, expect, it } from 'vitest';
import {
  LOCAL_BEST_KEY,
  V2_LOCAL_BEST_KEY,
  V2_1_LOCAL_BEST_KEY,
  V2_2_LOCAL_BEST_KEY,
  loadPixelGridV2_2Best,
  savePixelGridV2_2Best,
  type StorageLike
} from '../../src/app/identity';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('historical V2.2 persistence', () => {
  it('keeps the V2.2 helper independently addressable without mutating older history', () => {
    const storage = new MemoryStorage();
    storage.setItem(LOCAL_BEST_KEY, '68');
    storage.setItem(V2_LOCAL_BEST_KEY, '19');
    storage.setItem(V2_1_LOCAL_BEST_KEY, '12');

    expect(savePixelGridV2_2Best(storage, 9)).toBe(9);
    expect(savePixelGridV2_2Best(storage, 5)).toBe(9);
    expect(loadPixelGridV2_2Best(storage)).toBe(9);
    expect(storage.getItem(V2_2_LOCAL_BEST_KEY)).toBe('9');
    expect(storage.getItem(V2_1_LOCAL_BEST_KEY)).toBe('12');
    expect(storage.getItem(V2_LOCAL_BEST_KEY)).toBe('19');
    expect(storage.getItem(LOCAL_BEST_KEY)).toBe('68');
  });
});
