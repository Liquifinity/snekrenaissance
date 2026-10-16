import { describe, expect, it, vi } from 'vitest';
import { HttpSessionGateway } from '../../src/app/http-session-gateway';
import {
  LOCAL_BEST_KEY,
  V2_LOCAL_BEST_KEY,
  loadPixelGridV2Best,
  savePixelGridV2Best,
  type StorageLike
} from '../../src/app/identity';
import { LocalSessionGateway } from '../../src/app/session-gateway';
import { RULESET_ID } from '../../src/game/grid-config';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('V2 persistence/ranking boundary', () => {
  it('stores V2 best independently from historical V1 localBest', () => {
    const storage = new MemoryStorage();
    storage.setItem(LOCAL_BEST_KEY, '68');

    expect(savePixelGridV2Best(storage, 7)).toBe(7);
    expect(loadPixelGridV2Best(storage)).toBe(7);
    expect(storage.getItem(V2_LOCAL_BEST_KEY)).toBe('7');
    expect(storage.getItem(LOCAL_BEST_KEY)).toBe('68');
  });

  it('declares local V2 capability but rejects V2 on the legacy HTTP gateway', () => {
    expect(new LocalSessionGateway().supportsRuleset(RULESET_ID)).toBe(true);
    const fetchMock = vi.fn<typeof fetch>();
    expect(new HttpSessionGateway('/rank', fetchMock).supportsRuleset(RULESET_ID)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
