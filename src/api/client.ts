import type { ApiError, AuthResponse } from '@laito/shared';

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public body: ApiError | null,
  ) {
    super(ApiRequestError.humanize(status, body));
  }

  /** Code machine éventuel renvoyé par l'API (ex. EMAIL_NOT_VERIFIED). */
  get code(): string | undefined {
    const m = this.body?.message;
    const s = Array.isArray(m) ? m[0] : m;
    if (this.body?.error && /^[A-Z_]+$/.test(this.body.error)) return this.body.error;
    return s && /^[A-Z_]+$/.test(s) ? s : undefined;
  }

  static humanize(status: number, body: ApiError | null): string {
    const m = body?.message;
    const raw = Array.isArray(m) ? m.join(' · ') : m;
    if (raw && !/^[A-Z_]+$/.test(raw)) return raw;
    if (status === 0) return 'Connexion perdue – vos écrits sont gardés sur l’appareil.';
    if (status === 401) return 'Votre session a expiré, reconnectez-vous.';
    if (status === 403) return 'Vous n’avez pas accès à cette action.';
    if (status === 404) return 'Introuvable – ce contenu n’existe pas ou n’est pas partagé avec vous.';
    if (status === 409) return 'Ce contenu a changé ailleurs. Rechargez pour récupérer la dernière version.';
    if (status === 413) return 'Fichier trop volumineux (5 Mo maximum).';
    if (status === 429) return 'Trop de tentatives, réessayez dans un instant.';
    if (status >= 500) return 'Le serveur rencontre un souci. Réessayez dans un moment.';
    return 'Une erreur est survenue. Réessayez.';
  }
}

// ───────── Jeton d'accès : uniquement en mémoire ─────────
let accessToken: string | null = null;
type AuthListener = (res: AuthResponse | null) => void;
const listeners = new Set<AuthListener>();

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}
export function onAuthChange(fn: AuthListener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(res: AuthResponse | null) {
  listeners.forEach((l) => l(res));
}

// ───────── Rafraîchissement : une seule requête à la fois ─────────
let refreshing: Promise<AuthResponse | null> | null = null;

export function refreshSession(fetchImpl: typeof fetch = fetch): Promise<AuthResponse | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetchImpl(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) {
          setAccessToken(null);
          emit(null);
          return null;
        }
        const data = (await res.json()) as AuthResponse;
        setAccessToken(data.accessToken);
        emit(data);
        return data;
      } catch {
        return null; // hors ligne : on garde l'état courant
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Ne pas tenter de rafraîchir la session sur 401. */
  noRefresh?: boolean;
  fetchImpl?: typeof fetch;
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, noRefresh, fetchImpl = fetch, headers, ...init } = opts;
  const doFetch = () => {
    const h = new Headers(headers);
    if (accessToken) h.set('Authorization', `Bearer ${accessToken}`);
    let payload: BodyInit | undefined;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) {
      h.set('Content-Type', 'application/json');
      payload = JSON.stringify(body);
    }
    return fetchImpl(`${API_BASE}${path}`, { ...init, headers: h, body: payload, credentials: 'include' });
  };

  let res: Response;
  try {
    res = await doFetch();
  } catch {
    throw new ApiRequestError(0, null);
  }

  if (res.status === 401 && !noRefresh && !path.startsWith('/auth/')) {
    const refreshed = await refreshSession(fetchImpl);
    if (refreshed) {
      try {
        res = await doFetch();
      } catch {
        throw new ApiRequestError(0, null);
      }
    }
  }

  if (!res.ok) {
    let errBody: ApiError | null = null;
    try {
      errBody = (await res.json()) as ApiError;
    } catch {
      /* corps vide */
    }
    throw new ApiRequestError(res.status, errBody);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Envoi garanti à la fermeture de l'onglet (fetch keepalive, en-têtes autorisés). */
export function sendKeepalive(path: string, method: 'PUT' | 'POST', body: unknown) {
  try {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) h.Authorization = `Bearer ${accessToken}`;
    void fetch(`${API_BASE}${path}`, {
      method,
      headers: h,
      body: JSON.stringify(body),
      credentials: 'include',
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Une erreur est survenue.';
}
