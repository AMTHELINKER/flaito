import { createStore, del, entries, get, set, type UseStore } from 'idb-keyval';
import { chaptersApi } from '@/api/endpoints';

/**
 * Brouillons locaux (IndexedDB) : tout texte non encore confirmé par le
 * serveur y est conservé, pour ne rien perdre en cas de fermeture d'onglet
 * ou de coupure réseau. Ils sont synchronisés au retour de la connexion.
 */
export interface Draft {
  chapterId: string;
  content: string;
  baseVersion?: number;
  updatedAt: number;
}

let store: UseStore | null = null;
function db() {
  if (!store) store = createStore('laito', 'drafts');
  return store;
}
/**
 * IndexedDB peut être indisponible ou ne jamais répondre (navigation privée,
 * quotas, navigateurs embarqués) : on ne bloque jamais l'éditeur plus de 1,5 s.
 */
const safe = async <T>(fn: () => Promise<T>, fallback: T, timeoutMs = 1500): Promise<T> => {
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
    ]);
  } catch {
    return fallback;
  }
};

export const drafts = {
  get: (chapterId: string) => safe(() => get<Draft>(chapterId, db()), undefined),
  put: (d: Draft) => safe(() => set(d.chapterId, d, db()), undefined),
  remove: (chapterId: string) => safe(() => del(chapterId, db()), undefined),
  /** Supprime le brouillon seulement s'il correspond toujours au contenu enregistré. */
  async clearIfSaved(chapterId: string, savedContent: string) {
    const d = await drafts.get(chapterId);
    if (d && d.content === savedContent) await drafts.remove(chapterId);
  },
  all: () => safe(() => entries<string, Draft>(db()).then((xs) => xs.map(([, v]) => v)), [] as Draft[]),
};

let syncing = false;
/** Envoie au serveur tous les brouillons en attente. Retourne le nombre synchronisé. */
export async function syncPendingDrafts(): Promise<number> {
  if (syncing || !navigator.onLine) return 0;
  syncing = true;
  let n = 0;
  try {
    for (const d of await drafts.all()) {
      try {
        await chaptersApi.saveContent(d.chapterId, { content: d.content });
        await drafts.clearIfSaved(d.chapterId, d.content);
        n++;
      } catch {
        /* nouvel essai au prochain retour en ligne */
      }
    }
  } finally {
    syncing = false;
  }
  return n;
}
