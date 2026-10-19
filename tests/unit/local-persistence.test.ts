import { describe, expect, it } from 'vitest';
import {
  LOCAL_BEST_KEY,
  loadLocalBest,
  loadUsername,
  saveLocalBest,
  saveUsername,
  type StorageLike
} from '../../src/app/persistence';

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('local persistence', () => {
  it('preserves the canonical V5 best key and highest score', () => {
    const storage = new MemoryStorage();
    expect(LOCAL_BEST_KEY).toBe('snek.localBest.coreV5');
    expect(loadLocalBest(storage)).toBe(0);
    expect(saveLocalBest(storage, 24)).toBe(24);
    expect(saveLocalBest(storage, 18)).toBe(24);
    expect(storage.getItem('snek.localBest.coreV5')).toBe('24');
  });

  it('trims and restores the local username', () => {
    const storage = new MemoryStorage();
    saveUsername(storage, '  ren  ');
    expect(loadUsername(storage)).toBe('ren');
  });
});
