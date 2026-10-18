import { describe, expect, it, vi } from 'vitest';
import { HttpSessionGateway } from '../../src/app/http-session-gateway';
import {
  LOCAL_BEST_KEY,
  V2_LOCAL_BEST_KEY,
  V2_1_LOCAL_BEST_KEY,
  V2_2_LOCAL_BEST_KEY,
  loadPixelGridV2_2Best,
  savePixelGridV2_2Best,
  type StorageLike
} from '../../src/app/identity';
import { LocalSessionGateway } from '../../src/app/session-gateway';
import { RULESET_ID } from '../../src/game/grid-config';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('V2.2 persistence/ranking boundary', () => {
  it('stores V2.2 best independently from historical V1, V2 and V2.1 records', () => {
    const storage = new MemoryStorage();
    storage.setItem(LOCAL_BEST_KEY, '68');
    storage.setItem(V2_LOCAL_BEST_KEY, '19');
    storage.setItem(V2_1_LOCAL_BEST_KEY, '11');

    expect(savePixelGridV2_2Best(storage, 7)).toBe(7);
    expect(savePixelGridV2_2Best(storage, 4)).toBe(7);
    expect(loadPixelGridV2_2Best(storage)).toBe(7);
    expect(storage.getItem(V2_2_LOCAL_BEST_KEY)).toBe('7');
    expect(storage.getItem(V2_1_LOCAL_BEST_KEY)).toBe('11');
    expect(storage.getItem(V2_LOCAL_BEST_KEY)).toBe('19');
    expect(storage.getItem(LOCAL_BEST_KEY)).toBe('68');
  });

  it('declares local V2.2 capability but rejects V2.2 on the legacy HTTP gateway', () => {
    expect(RULESET_ID).toBe('pixel-flight-grid-v2-2');
    expect(new LocalSessionGateway().supportsRuleset(RULESET_ID)).toBe(true);
    const fetchMock = vi.fn<typeof fetch>();
    expect(new HttpSessionGateway('/rank', fetchMock).supportsRuleset(RULESET_ID)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
