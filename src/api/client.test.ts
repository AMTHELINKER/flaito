import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiRequestError, getAccessToken, setAccessToken } from './client';

const json = (status: number, body: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

afterEach(() => setAccessToken(null));

describe('api client', () => {
  it('envoie le jeton Bearer', async () => {
    setAccessToken('tok');
    const fetchImpl = vi.fn().mockResolvedValue(json(200, { ok: true }));
    await api('/me', { fetchImpl });
    const headers = fetchImpl.mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer tok');
    expect(fetchImpl.mock.calls[0][1].credentials).toBe('include');
  });

  it('rafraîchit la session une seule fois pour des 401 simultanés, puis rejoue', async () => {
    setAccessToken('old');
    let refreshCalls = 0;
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls++;
        await new Promise((r) => setTimeout(r, 5));
        return json(200, { accessToken: 'new', user: { id: 'u' } });
      }
      const auth = (init.headers as Headers).get('Authorization');
      return auth === 'Bearer new' ? json(200, { url }) : json(401, { statusCode: 401, message: 'Unauthorized' });
    });
    const [a, b] = await Promise.all([
      api<{ url: string }>('/books/mine', { fetchImpl: fetchImpl as unknown as typeof fetch }),
      api<{ url: string }>('/me', { fetchImpl: fetchImpl as unknown as typeof fetch }),
    ]);
    expect(refreshCalls).toBe(1);
    expect(a.url).toContain('/books/mine');
    expect(b.url).toContain('/me');
    expect(getAccessToken()).toBe('new');
  });

  it('propage une erreur lisible et le code machine', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(json(403, { statusCode: 403, message: 'EMAIL_NOT_VERIFIED', error: 'Forbidden' }));
    const err = (await api('/auth/login', { method: 'POST', body: {}, fetchImpl }).catch((e: unknown) => e)) as ApiRequestError;
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err.status).toBe(403);
    expect(err.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('signale une coupure réseau avec un message rassurant', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const err = (await api('/me', { fetchImpl }).catch((e: unknown) => e)) as ApiRequestError;
    expect(err.status).toBe(0);
    expect(err.message).toMatch(/gardés sur l’appareil/);
  });
});
