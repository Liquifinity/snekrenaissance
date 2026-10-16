import { describe, expect, test, vi } from 'vitest';
import { createSessionGateway } from '../../src/app/gateway-selection';
import { HttpSessionGateway } from '../../src/app/http-session-gateway';
import { LocalSessionGateway } from '../../src/app/session-gateway';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

describe('runtime gateway selection', () => {
  test('unset/blank API base selects the network-free local gateway', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const unset = createSessionGateway(undefined, fetchMock);
    const blank = createSessionGateway('   ', fetchMock);

    expect(unset).toBeInstanceOf(LocalSessionGateway);
    expect(blank).toBeInstanceOf(LocalSessionGateway);
    await expect(unset.startRun({ playerId: 'p', username: 'ren' })).resolves.toEqual({
      ranked: false,
      sessionId: null
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('non-empty API base selects the ranked HTTP gateway', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      sessionId: 'session-1',
      startedAt: 1
    }, 201));
    const gateway = createSessionGateway('/rank', fetchMock);

    expect(gateway).toBeInstanceOf(HttpSessionGateway);
    await expect(gateway.startRun({ playerId: 'player-1', username: 'ren' })).resolves.toEqual({
      ranked: true,
      sessionId: 'session-1'
    });
    expect(fetchMock.mock.calls[0][0]).toBe('/rank/api/games');
  });
});
