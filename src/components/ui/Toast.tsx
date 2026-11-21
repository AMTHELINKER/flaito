import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { cx } from './primitives';

interface ToastItem {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
  undo?: () => void;
  duration: number;
}

interface ToastApi {
  show: (message: string, opts?: { tone?: ToastItem['tone']; duration?: number }) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  /**
   * Action annulable : `commit` est exécuté après le délai si l'utilisateur
   * n'a pas cliqué sur « Annuler ». `revert` restaure l'état local.
   */
  undoable: (
    message: string,
    commit: () => void | Promise<void>,
    revert?: () => void,
    ms?: number,
  ) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (t: Omit<ToastItem, 'id'>) => {
      const id = nextId.current++;
      setItems((xs) => [...xs.slice(-2), { ...t, id }]);
      window.setTimeout(() => dismiss(id), t.duration);
      return id;
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show: (message, o) =>
        void push({ message, tone: o?.tone ?? 'info', duration: o?.duration ?? 3000 }),
      success: (message) => void push({ message, tone: 'success', duration: 2600 }),
      error: (message) => void push({ message, tone: 'error', duration: 5000 }),
      undoable: (message, commit, revert, ms = 5000) => {
        let cancelled = false;
        const timer = window.setTimeout(() => {
          if (!cancelled) void commit();
        }, ms);
        push({
          message,
          tone: 'info',
          duration: ms,
          undo: () => {
            cancelled = true;
            window.clearTimeout(timer);
            revert?.();
          },
        });
      },
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
        aria-live="polite"
        role="status"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cx(
              'glass pointer-events-auto flex max-w-md items-center gap-3 rounded-lg px-4 py-2.5 text-sm animate-rise',
              t.tone === 'error' && 'border-danger/40',
            )}
          >
            <Icon
              name={t.tone === 'error' ? 'cloudOff' : t.tone === 'success' ? 'check' : 'sparkle'}
              size={18}
              className={t.tone === 'error' ? 'text-danger' : 'text-accent-text'}
            />
            <span>{t.message}</span>
            {t.undo && (
              <button
                type="button"
                className="pressable ml-1 rounded-sm px-2 py-1 font-semibold text-accent-text underline-offset-2 hover:underline"
                onClick={() => {
                  t.undo?.();
                  dismiss(t.id);
                }}
              >
                Annuler
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans <ToastProvider>');
  return ctx;
}
