import { readFileSync } from 'node:fs';
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

type V5IdentityApi = typeof identityModule & {
  V5_LOCAL_BEST_KEY?: string;
  loadSnekCoreV5Best?: (storage: identityModule.StorageLike) => number;
  saveSnekCoreV5Best?: (storage: identityModule.StorageLike, score: number) => number;
};

const controllerSource = readFileSync(new URL('../../src/app/app-controller.ts', import.meta.url), 'utf8');

describe('SNEK CORE V5 persistence and ranking boundary', () => {
  it('uses a V5-only best key without reading or overwriting V4', () => {
    const identity = identityModule as V5IdentityApi;
    expect(identity.V5_LOCAL_BEST_KEY).toBe('snek.localBest.coreV5');
    expect(typeof identity.loadSnekCoreV5Best).toBe('function');
    expect(typeof identity.saveSnekCoreV5Best).toBe('function');
    if (!identity.loadSnekCoreV5Best || !identity.saveSnekCoreV5Best) return;

    const storage = new MemoryStorage();
    storage.setItem(identityModule.V4_LOCAL_BEST_KEY, '41');
    expect(identity.loadSnekCoreV5Best(storage)).toBe(0);
    expect(identity.saveSnekCoreV5Best(storage, 15)).toBe(15);
    expect(identity.saveSnekCoreV5Best(storage, 9)).toBe(15);
    expect(storage.getItem(identity.V5_LOCAL_BEST_KEY!)).toBe('15');
    expect(storage.getItem(identityModule.V4_LOCAL_BEST_KEY)).toBe('41');
  });

  it('makes AppController read and write V5 best only', () => {
    expect(controllerSource).toContain('loadSnekCoreV5Best');
    expect(controllerSource).toContain('saveSnekCoreV5Best');
    expect(controllerSource).not.toContain('loadSnekCoreV4Best');
    expect(controllerSource).not.toContain('saveSnekCoreV4Best');
  });

  it('declares V5 local-capable while the historical HTTP ranking API remains unsupported', () => {
    expect(RULESET_ID).toBe('snek-core-v5');
    expect(new LocalSessionGateway().supportsRuleset(RULESET_ID)).toBe(true);
    const fetchMock = vi.fn<typeof fetch>();
    expect(new HttpSessionGateway('/rank', fetchMock).supportsRuleset(RULESET_ID)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
