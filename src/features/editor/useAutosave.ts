import { useCallback, useEffect, useRef, useState } from 'react';
import { AUTOSAVE_DELAY_MS } from '@laito/shared';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'offline' | 'error';

export interface AutosaveOptions {
  /** Envoie le contenu au serveur. Doit rejeter en cas d'échec. */
  save: (content: string) => Promise<void>;
  /** Appelé à chaque frappe (sauvegarde locale immédiate). */
  onLocalChange?: (content: string) => void;
  /** Envoi « au mieux » à la fermeture de la page. */
  onUnload?: (content: string) => void;
  delay?: number;
  isOnline?: () => boolean;
}

/**
 * Sauvegarde automatique : enregistre `delay` ms (2 s) après la dernière
 * frappe, garde l'état « Enregistré / Enregistrement… / Hors ligne », et
 * tente un envoi final à la fermeture de l'onglet.
 */
export function useAutosave({
  save,
  onLocalChange,
  onUnload,
  delay = AUTOSAVE_DELAY_MS,
  isOnline = () => navigator.onLine,
}: AutosaveOptions) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const latest = useRef<string | null>(null);
  const dirty = useRef(false);
  const inflight = useRef<Promise<void> | null>(null);
  const saveRef = useRef(save);
  const unloadRef = useRef(onUnload);
  const localRef = useRef(onLocalChange);
  const onlineRef = useRef(isOnline);
  useEffect(() => {
    saveRef.current = save;
    unloadRef.current = onUnload;
    localRef.current = onLocalChange;
    onlineRef.current = isOnline;
  });

  const run = useCallback(async (): Promise<void> => {
    if (!dirty.current || latest.current === null) return;
    if (!onlineRef.current()) {
      setStatus('offline');
      return;
    }
    if (inflight.current) {
      await inflight.current;
      return run();
    }
    const content = latest.current;
    dirty.current = false;
    setStatus('saving');
    const p = saveRef
      .current(content)
      .then(() => {
        if (!dirty.current) setStatus('saved');
      })
      .catch(() => {
        dirty.current = true;
        setStatus(onlineRef.current() ? 'error' : 'offline');
      })
      .finally(() => {
        inflight.current = null;
      });
    inflight.current = p;
    await p;
  }, []);

  const debounced = useDebouncedCallback(() => void run(), delay);

  const change = useCallback(
    (content: string) => {
      latest.current = content;
      dirty.current = true;
      setStatus(onlineRef.current() ? 'dirty' : 'offline');
      localRef.current?.(content);
      debounced.call();
    },
    [debounced],
  );

  const flush = useCallback(async () => {
    debounced.cancel();
    await run();
  }, [debounced, run]);

  /** Réinitialise l'état (changement de chapitre). */
  const reset = useCallback(
    (status: SaveStatus = 'idle') => {
      debounced.cancel();
      latest.current = null;
      dirty.current = false;
      setStatus(status);
    },
    [debounced],
  );

  useEffect(() => {
    const onOnline = () => {
      if (dirty.current) void run();
    };
    const onOffline = () => {
      if (dirty.current) setStatus('offline');
    };
    const onHide = () => {
      if (dirty.current && latest.current !== null) {
        debounced.cancel();
        unloadRef.current?.(latest.current);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide();
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [run, debounced]);

  return { status, change, flush, reset, isDirty: () => dirty.current };
}
