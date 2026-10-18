import { describe, expect, it } from 'vitest';
import * as identityModule from '../../src/app/identity';

class MemoryStorage implements identityModule.StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('historical SNEK CORE V4 persistence', () => {
  it('keeps the V4 key and helpers isolated for historical data only', () => {
    expect(identityModule.V4_LOCAL_BEST_KEY).toBe('snek.localBest.coreV4');
    const storage = new MemoryStorage();
    storage.setItem(identityModule.V3_LOCAL_BEST_KEY, '31');
    expect(identityModule.loadSnekCoreV4Best(storage)).toBe(0);
    expect(identityModule.saveSnekCoreV4Best(storage, 12)).toBe(12);
    expect(identityModule.saveSnekCoreV4Best(storage, 7)).toBe(12);
    expect(storage.getItem(identityModule.V4_LOCAL_BEST_KEY)).toBe('12');
    expect(storage.getItem(identityModule.V3_LOCAL_BEST_KEY)).toBe('31');
  });
});
