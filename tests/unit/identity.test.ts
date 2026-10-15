import { describe, expect, it } from 'vitest';
import {
  getOrCreatePlayerId,
  loadUsername,
  saveUsername,
  type StorageLike
} from '../../src/app/identity';

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('anonymous player identity', () => {
  it('creates a non-empty anonymous player id on first use', () => {
    const storage = new MemoryStorage();
    const id = getOrCreatePlayerId(storage, () => 'player-123');
    expect(id).toBe('player-123');
  });

  it('reuses the same stored player id on subsequent calls', () => {
    const storage = new MemoryStorage();
    const first = getOrCreatePlayerId(storage, () => 'player-123');
    const second = getOrCreatePlayerId(storage, () => 'different-id');
    expect(second).toBe(first);
  });

  it('keeps username separate from anonymous player id', () => {
    const storage = new MemoryStorage();
    const id = getOrCreatePlayerId(storage, () => 'player-123');
    saveUsername(storage, 'ren');

    expect(loadUsername(storage)).toBe('ren');
    expect(getOrCreatePlayerId(storage, () => 'other')).toBe(id);
    expect(id).not.toBe('ren');
  });
});
