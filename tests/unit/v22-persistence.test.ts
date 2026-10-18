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

describe('V2.2 persistence and ranking boundary', () => {
  it('stores V2.2 best independently from V1, V2 and V2.1 history', () => {
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

  it('uses the V2.2 ruleset locally while legacy HTTP ranking remains unsupported', () => {
    expect(RULESET_ID).toBe('pixel-flight-grid-v2-2');
    expect(new LocalSessionGateway().supportsRuleset(RULESET_ID)).toBe(true);
    const fetchMock = vi.fn<typeof fetch>();
    expect(new HttpSessionGateway('/rank', fetchMock).supportsRuleset(RULESET_ID)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
