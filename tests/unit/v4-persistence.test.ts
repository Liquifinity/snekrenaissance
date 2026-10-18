import { describe, expect, it, vi } from 'vitest';
import { HttpSessionGateway } from '../../src/app/http-session-gateway';
import * as identityModule from '../../src/app/identity';
import { LocalSessionGateway } from '../../src/app/session-gateway';
import { RULESET_ID } from '../../src/game/grid-config';

class MemoryStorage implements identityModule.StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

type V4IdentityApi = typeof identityModule & {
  V4_LOCAL_BEST_KEY?: string;
  loadSnekCoreV4Best?: (storage: identityModule.StorageLike) => number;
  saveSnekCoreV4Best?: (storage: identityModule.StorageLike, score: number) => number;
};

describe('SNEK CORE V4 persistence and ranking boundary', () => {
  it('uses a V4-only best key without reading or overwriting V3', () => {
    const identity = identityModule as V4IdentityApi;
    expect(identity.V4_LOCAL_BEST_KEY).toBe('snek.localBest.coreV4');
    expect(typeof identity.loadSnekCoreV4Best).toBe('function');
    expect(typeof identity.saveSnekCoreV4Best).toBe('function');
    if (!identity.loadSnekCoreV4Best || !identity.saveSnekCoreV4Best) return;

    const storage = new MemoryStorage();
    storage.setItem(identityModule.V3_LOCAL_BEST_KEY, '31');
    expect(identity.loadSnekCoreV4Best(storage)).toBe(0);
    expect(identity.saveSnekCoreV4Best(storage, 12)).toBe(12);
    expect(identity.saveSnekCoreV4Best(storage, 7)).toBe(12);
    expect(storage.getItem(identity.V4_LOCAL_BEST_KEY!)).toBe('12');
    expect(storage.getItem(identityModule.V3_LOCAL_BEST_KEY)).toBe('31');
  });

  it('declares the V4 ruleset local-capable while the historical HTTP ranking API remains unsupported', () => {
    expect(RULESET_ID).toBe('snek-core-v4');
    expect(new LocalSessionGateway().supportsRuleset(RULESET_ID)).toBe(true);
    const fetchMock = vi.fn<typeof fetch>();
    expect(new HttpSessionGateway('/rank', fetchMock).supportsRuleset(RULESET_ID)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
