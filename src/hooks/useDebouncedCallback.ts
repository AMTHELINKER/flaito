import { useCallback, useEffect, useMemo, useRef } from 'react';

/**
 * Retourne une fonction « débattue » : `fn` n'est appelée que `delay` ms après
 * le dernier appel. `flush` exécute immédiatement l'appel en attente
 * (c'est aussi le cas au démontage du composant).
 */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delay: number) {
  const fnRef = useRef(fn);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<A | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current) {
      const args = pending.current;
      pending.current = null;
      fnRef.current(...args);
    }
  }, []);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
  }, []);

  const call = useCallback(
    (...args: A) => {
      pending.current = args;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [delay, flush],
  );

  // Au démontage, l'appel en attente est exécuté (aucune modification perdue).
  useEffect(() => flush, [flush]);

  return useMemo(
    () => ({ call, flush, cancel, isPending: () => pending.current !== null }),
    [call, flush, cancel],
  );
}
