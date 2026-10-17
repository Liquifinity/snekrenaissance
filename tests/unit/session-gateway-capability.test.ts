import { describe, expect, it, vi } from 'vitest';
import { HttpSessionGateway } from '../../src/app/http-session-gateway';
import { LocalSessionGateway } from '../../src/app/session-gateway';
import { RULESET_ID } from '../../src/game/grid-config';

describe('SessionGateway ruleset capability', () => {
  it('keeps V2 local-first until an HTTP validator explicitly supports the ruleset', () => {
    expect(new LocalSessionGateway().supportsRuleset(RULESET_ID)).toBe(true);
    const fetchMock = vi.fn<typeof fetch>();
    expect(new HttpSessionGateway('/rank', fetchMock).supportsRuleset(RULESET_ID)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
