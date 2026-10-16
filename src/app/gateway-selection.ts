import { HttpSessionGateway } from './http-session-gateway';
import { LocalSessionGateway, type SessionGateway } from './session-gateway';

export function createSessionGateway(
  apiBase: string | undefined,
  fetchImpl: typeof fetch = fetch
): SessionGateway {
  const base = apiBase?.trim() ?? '';
  if (!base) return new LocalSessionGateway();
  return new HttpSessionGateway(base, fetchImpl);
}
