import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthResponse, LoginRequest, MeDto, UserSettingsDto } from '@laito/shared';
import { useQueryClient } from '@tanstack/react-query';
import { onAuthChange, refreshSession, setAccessToken } from '@/api/client';
import { authApi, meApi } from '@/api/endpoints';
import { applyTheme } from '@/lib/theme';
import { readLocal, writeLocal } from '@/lib/storage';

const USER_CACHE = 'laito.cachedUser';
const API_CACHES = ['laito-reading', 'laito-writing', 'laito-images'];

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: Status;
  user: MeDto | null;
  login: (b: LoginRequest) => Promise<MeDto>;
  acceptAuth: (res: AuthResponse) => MeDto;
  logout: () => Promise<void>;
  setUser: (u: MeDto | ((prev: MeDto) => MeDto)) => void;
  updateSettings: (patch: Partial<UserSettingsDto>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<MeDto | null>(null);
  const qc = useQueryClient();

  const acceptAuth = useCallback((res: AuthResponse) => {
    setAccessToken(res.accessToken);
    setUserState(res.user);
    writeLocal(USER_CACHE, res.user);
    setStatus('authenticated');
    applyTheme(res.user.settings.theme);
    return res.user;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void refreshSession().then((res) => {
      if (cancelled) return;
      if (res) acceptAuth(res);
      else {
        // Hors ligne : on reprend la dernière session connue pour écrire et lire.
        const cached = readLocal<MeDto | null>(USER_CACHE, null);
        if (!navigator.onLine && cached) {
          setUserState(cached);
          setStatus('authenticated');
          const retry = () => void refreshSession();
          window.addEventListener('online', retry, { once: true });
        } else setStatus('anonymous');
      }
    });
    const off = onAuthChange((res) => {
      if (res) {
        setUserState(res.user);
        setStatus('authenticated');
      } else {
        setUserState(null);
        setStatus('anonymous');
      }
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [acceptAuth]);

  const login = useCallback(
    async (b: LoginRequest) => acceptAuth(await authApi.login(b)),
    [acceptAuth],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* déconnexion locale malgré tout */
    }
    setAccessToken(null);
    setUserState(null);
    setStatus('anonymous');
    qc.clear();
    try {
      localStorage.removeItem(USER_CACHE);
      if ('caches' in window) await Promise.all(API_CACHES.map((c) => caches.delete(c)));
    } catch {
      /* ignore */
    }
  }, [qc]);

  const setUser = useCallback((u: MeDto | ((prev: MeDto) => MeDto)) => {
    setUserState((prev) => {
      const next = typeof u === 'function' ? (prev ? u(prev) : prev) : u;
      if (next) writeLocal(USER_CACHE, next);
      return next;
    });
  }, []);

  const updateSettings = useCallback(async (patch: Partial<UserSettingsDto>) => {
    if (patch.theme) applyTheme(patch.theme);
    setUserState((prev) =>
      prev
        ? {
            ...prev,
            settings: {
              ...prev.settings,
              ...patch,
              readingPreferences: {
                ...prev.settings.readingPreferences,
                ...(patch.readingPreferences ?? {}),
              },
            },
          }
        : prev,
    );
    const settings = await meApi.updateSettings(patch);
    setUserState((prev) => (prev ? { ...prev, settings } : prev));
  }, []);

  const value = useMemo(
    () => ({ status, user, login, acceptAuth, logout, setUser, updateSettings }),
    [status, user, login, acceptAuth, logout, setUser, updateSettings],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
