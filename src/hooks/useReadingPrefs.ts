import { useCallback, useState } from 'react';
import { DEFAULT_READING_PREFERENCES, type ReadingPreferences } from '@laito/shared';
import { useAuth } from '@/auth/AuthProvider';
import { readLocal, writeLocal } from '@/lib/storage';
import { useDebouncedCallback } from './useDebouncedCallback';

const KEY = 'laito.readingPreferences';

function initial(remote?: Partial<ReadingPreferences>): ReadingPreferences {
  return {
    ...DEFAULT_READING_PREFERENCES,
    ...(remote ?? readLocal<Partial<ReadingPreferences>>(KEY, {})),
  };
}

/**
 * Préférences de lecture : synchronisées sur le compte (tous les appareils)
 * quand l'utilisateur est connecté, sinon conservées localement.
 */
export function useReadingPrefs() {
  const { user, updateSettings } = useAuth();
  const [prefs, setPrefs] = useState<ReadingPreferences>(() => initial(user?.settings.readingPreferences));
  const [syncedFor, setSyncedFor] = useState(user?.id ?? null);

  // Le compte se charge après l'ouverture : on adopte alors ses préférences.
  if ((user?.id ?? null) !== syncedFor) {
    setSyncedFor(user?.id ?? null);
    if (user) setPrefs(initial(user.settings.readingPreferences));
  }

  const pushRemote = useDebouncedCallback((p: ReadingPreferences) => {
    void updateSettings({ readingPreferences: p }).catch(() => undefined);
  }, 600);

  const update = useCallback(
    (patch: Partial<ReadingPreferences>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        writeLocal(KEY, next);
        if (user) pushRemote.call(next);
        return next;
      });
    },
    [user, pushRemote],
  );

  return [prefs, update] as const;
}
