import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutosave } from './useAutosave';

describe('useAutosave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('enregistre 2 s après la dernière frappe, une seule fois', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutosave({ save, isOnline: () => true }));

    act(() => result.current.change('a'));
    await act(() => vi.advanceTimersByTimeAsync(1500));
    act(() => result.current.change('ab'));
    await act(() => vi.advanceTimersByTimeAsync(1999));
    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe('dirty');

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('ab');
    expect(result.current.status).toBe('saved');
  });

  it('sauvegarde localement à chaque frappe', () => {
    const onLocalChange = vi.fn();
    const { result } = renderHook(() =>
      useAutosave({
        save: vi.fn().mockResolvedValue(undefined),
        onLocalChange,
        isOnline: () => true,
      }),
    );
    act(() => result.current.change('x'));
    expect(onLocalChange).toHaveBeenCalledWith('x');
  });

  it('passe en « hors ligne » sans appeler le serveur, puis synchronise au retour', async () => {
    let online = false;
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutosave({ save, isOnline: () => online }));

    act(() => result.current.change('hors ligne'));
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe('offline');

    online = true;
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(save).toHaveBeenCalledWith('hors ligne');
    expect(result.current.status).toBe('saved');
  });

  it('garde le contenu en attente si l’enregistrement échoue', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutosave({ save, isOnline: () => true }));
    act(() => result.current.change('texte'));
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(result.current.status).toBe('error');
    expect(result.current.isDirty()).toBe(true);
    await act(() => result.current.flush());
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('saved');
  });

  it('envoie le contenu non enregistré à la fermeture de la page', () => {
    const onUnload = vi.fn();
    const { result } = renderHook(() =>
      useAutosave({ save: vi.fn().mockResolvedValue(undefined), onUnload, isOnline: () => true }),
    );
    act(() => result.current.change('dernier mot'));
    window.dispatchEvent(new Event('pagehide'));
    expect(onUnload).toHaveBeenCalledWith('dernier mot');
  });
});
