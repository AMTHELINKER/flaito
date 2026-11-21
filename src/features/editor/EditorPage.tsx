import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  countWords,
  readingMinutes,
  type ChapterDto,
  type UpdateChapterRequest,
} from '@laito/shared';
import { ApiRequestError, errorMessage, sendKeepalive } from '@/api/client';
import { booksApi, chaptersApi, qk } from '@/api/endpoints';
import { Celebration } from '@/components/Celebration';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/Modal';
import { ErrorNotice, IconButton, Skeleton, cx } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useOnline } from '@/hooks/useOnline';
import { formatWords } from '@/lib/format';
import { readLocal, writeLocal } from '@/lib/storage';
import { ChapterSidebar } from './ChapterSidebar';
import { drafts } from './drafts';
import { FormatToolbar, type FormatAction } from './FormatToolbar';
import {
  applyEdit,
  caretCoords,
  centerEdit,
  linePrefixEdit,
  sceneBreakEdit,
  wrapEdit,
} from './textareaTools';
import { useAutosave, type SaveStatus } from './useAutosave';

export function EditorPage() {
  const { bookId = '', chapterId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const book = useQuery({ queryKey: qk.book(bookId), queryFn: () => booksApi.get(bookId) });
  const chapters = useQuery({
    queryKey: qk.chapters(bookId),
    queryFn: () => booksApi.chapters(bookId),
  });

  const [sidebar, setSidebar] = useState(() => readLocal('laito.editor.sidebar', true));
  const [mobileList, setMobileList] = useState(false);
  const [zen, setZen] = useState(false);
  const [focusMode, setFocusMode] = useState(() => readLocal('laito.editor.focus', false));
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [toDelete, setToDelete] = useState<ChapterDto | null>(null);
  const [celebrate, setCelebrate] = useState(0);

  useEffect(() => writeLocal('laito.editor.sidebar', sidebar), [sidebar]);
  useEffect(() => writeLocal('laito.editor.focus', focusMode), [focusMode]);

  const setChapters = useCallback(
    (fn: (xs: ChapterDto[]) => ChapterDto[]) =>
      qc.setQueryData<ChapterDto[]>(qk.chapters(bookId), (xs) => (xs ? fn(xs) : xs)),
    [qc, bookId],
  );

  const addChapter = useMutation({
    mutationFn: () =>
      booksApi.createChapter(bookId, { title: `Chapitre ${(chapters.data?.length ?? 0) + 1}` }),
    onSuccess: (ch) => {
      setChapters((xs) => [...xs, ch]);
      void qc.invalidateQueries({ queryKey: qk.myBooks });
      navigate(`/livres/${bookId}/ecrire/${ch.id}`);
      setMobileList(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const reorder = useCallback(
    async (ids: string[]) => {
      const prev = qc.getQueryData<ChapterDto[]>(qk.chapters(bookId)) ?? [];
      const byId = new Map(prev.map((c) => [c.id, c]));
      setChapters(() => ids.map((id, i) => ({ ...byId.get(id)!, position: i })));
      try {
        const saved = await booksApi.reorder(bookId, ids);
        qc.setQueryData(qk.chapters(bookId), saved);
      } catch (e) {
        qc.setQueryData(qk.chapters(bookId), prev);
        toast.error(`Réorganisation non enregistrée. ${errorMessage(e)}`);
      }
    },
    [qc, bookId, setChapters, toast],
  );

  const updateChapter = useCallback(
    async (id: string, patch: UpdateChapterRequest) => {
      const prev = qc.getQueryData<ChapterDto[]>(qk.chapters(bookId));
      const before = prev?.find((c) => c.id === id);
      setChapters((xs) => xs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      try {
        const saved = await chaptersApi.update(id, patch);
        setChapters((xs) => xs.map((c) => (c.id === id ? saved : c)));
        if (patch.status === 'published' && before?.status !== 'published') {
          setCelebrate(Date.now());
          toast.success('Chapitre publié ✦');
        }
      } catch (e) {
        if (prev) qc.setQueryData(qk.chapters(bookId), prev);
        toast.error(errorMessage(e));
      }
    },
    [qc, bookId, setChapters, toast],
  );

  const confirmDelete = () => {
    const ch = toDelete;
    setToDelete(null);
    if (!ch) return;
    const prev = qc.getQueryData<ChapterDto[]>(qk.chapters(bookId)) ?? [];
    const remaining = prev.filter((c) => c.id !== ch.id);
    setChapters(() => remaining);
    if (ch.id === chapterId) {
      navigate(
        remaining[0] ? `/livres/${bookId}/ecrire/${remaining[0].id}` : `/livres/${bookId}/ecrire`,
        {
          replace: true,
        },
      );
    }
    toast.undoable(
      `« ${ch.title} » supprimé.`,
      async () => {
        try {
          await chaptersApi.remove(ch.id);
          void drafts.remove(ch.id);
          void qc.invalidateQueries({ queryKey: qk.myBooks });
        } catch (e) {
          qc.setQueryData(qk.chapters(bookId), prev);
          toast.error(errorMessage(e));
        }
      },
      () => qc.setQueryData(qk.chapters(bookId), prev),
    );
  };

  // Plein écran sans distraction
  const toggleZen = useCallback(async () => {
    const next = !zen;
    setZen(next);
    try {
      if (next && !document.fullscreenElement) await document.documentElement.requestFullscreen?.();
      if (!next && document.fullscreenElement) await document.exitFullscreen?.();
    } catch {
      /* le mode zen fonctionne aussi sans l'API plein écran */
    }
  }, [zen]);

  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setZen(false);
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Raccourcis clavier globaux de l'éditeur
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        addChapter.mutate();
      } else if (e.key === 'F11' || (mod && e.shiftKey && e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        void toggleZen();
      } else if (mod && e.key === '\\') {
        e.preventDefault();
        setSidebar((s) => !s);
      } else if (e.key === 'Escape' && zen && !document.fullscreenElement) {
        setZen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addChapter, toggleZen, zen]);

  if (book.error) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <ErrorNotice error={book.error} onRetry={() => book.refetch()} />
        <Link to="/bibliotheque" className="mt-4 inline-block text-accent-text underline">
          Retour à la bibliothèque
        </Link>
      </div>
    );
  }

  // Pas de chapitre choisi : on ouvre le premier (ou on en crée un).
  if (!chapterId && chapters.data) {
    if (chapters.data.length)
      return <Navigate to={`/livres/${bookId}/ecrire/${chapters.data[0].id}`} replace />;
    return <CreateFirstChapter bookId={bookId} />;
  }

  const current = chapters.data?.find((c) => c.id === chapterId);
  const sidebarEl = book.data && chapters.data && (
    <ChapterSidebar
      bookId={bookId}
      bookTitle={book.data.title}
      chapters={chapters.data}
      currentId={chapterId}
      onSelect={(id) => {
        navigate(`/livres/${bookId}/ecrire/${id}`);
        setMobileList(false);
      }}
      onAdd={() => addChapter.mutate()}
      adding={addChapter.isPending}
      onReorder={reorder}
      onUpdate={updateChapter}
      onDelete={setToDelete}
    />
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      <Celebration trigger={celebrate} />
      {/* Panneau latéral repliable (bureau) */}
      <aside
        aria-label="Chapitres"
        className={cx(
          'glass z-20 m-3 mr-0 hidden shrink-0 overflow-hidden rounded-xl transition-[width,opacity,margin] duration-200 md:block',
          sidebar && !zen ? 'w-72 opacity-100' : 'pointer-events-none m-0 w-0 opacity-0',
        )}
      >
        {sidebarEl ?? <SidebarSkeleton />}
      </aside>

      {/* Tiroir mobile */}
      {mobileList && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 bg-ink/30"
            onClick={() => setMobileList(false)}
          />
          <div className="glass absolute inset-y-2 left-2 w-[min(20rem,85vw)] rounded-xl animate-rise">
            {sidebarEl && (
              <ChapterSidebar {...sidebarEl.props} onClose={() => setMobileList(false)} />
            )}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cx(
            'z-10 flex items-center gap-1 px-2 py-2 transition-opacity duration-200 sm:px-4',
            zen && 'opacity-0 hover:opacity-100 focus-within:opacity-100',
          )}
        >
          <Link
            to="/bibliotheque"
            aria-label="Retour à la bibliothèque"
            className="pressable inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-fg/[0.07]"
          >
            <Icon name="chevronLeft" />
          </Link>
          <IconButton
            icon="sidebar"
            label="Chapitres"
            className="md:hidden"
            onClick={() => setMobileList(true)}
          />
          <IconButton
            icon="sidebar"
            label={sidebar ? 'Masquer les chapitres (Ctrl+\\)' : 'Afficher les chapitres (Ctrl+\\)'}
            className="max-md:hidden"
            active={sidebar}
            onClick={() => setSidebar((s) => !s)}
          />
          <p className="min-w-0 flex-1 truncate px-2 text-sm text-muted">
            {book.data?.title}
            {current && <span className="hidden sm:inline"> · {current.title}</span>}
          </p>
          <SaveIndicator status={status} />
          <IconButton
            icon="eye"
            label={focusMode ? 'Désactiver le mode concentration' : 'Mode concentration'}
            active={focusMode}
            onClick={() => setFocusMode((f) => !f)}
          />
          <IconButton
            icon={zen ? 'minimize' : 'maximize'}
            label={zen ? 'Quitter le plein écran' : 'Plein écran (Ctrl+Maj+F)'}
            onClick={() => void toggleZen()}
          />
        </header>

        <main id="contenu" className="relative min-h-0 flex-1 overflow-y-auto">
          {chapterId && current ? (
            <ChapterWriter
              key={chapterId}
              bookId={bookId}
              chapter={current}
              focusMode={focusMode}
              onStatus={setStatus}
              onTitle={(title) => updateChapter(chapterId, { title })}
              firstVisit={params.get('premier') === '1'}
            />
          ) : chapters.isLoading || book.isLoading ? (
            <WriterSkeleton />
          ) : (
            <div className="mx-auto max-w-lg p-6">
              <ErrorNotice error={new ApiRequestError(404, null)} />
            </div>
          )}
        </main>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer ce chapitre ?"
        message={
          <>
            « {toDelete?.title} » et son texte seront supprimés. Vous pourrez annuler pendant
            quelques secondes.
          </>
        }
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function CreateFirstChapter({ bookId }: { bookId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void booksApi.createChapter(bookId, { title: 'Chapitre 1' }).then((ch) => {
      qc.setQueryData<ChapterDto[]>(qk.chapters(bookId), [ch]);
      navigate(`/livres/${bookId}/ecrire/${ch.id}`, { replace: true });
    });
  }, [bookId, navigate, qc]);
  return <WriterSkeleton />;
}

// ───────────────────────── Zone d'écriture ─────────────────────────

function ChapterWriter({
  bookId,
  chapter,
  focusMode,
  onStatus,
  onTitle,
  firstVisit,
}: {
  bookId: string;
  chapter: ChapterDto;
  focusMode: boolean;
  onStatus: (s: SaveStatus) => void;
  onTitle: (title: string) => void;
  firstVisit: boolean;
}) {
  const id = chapter.id;
  const qc = useQueryClient();
  const toast = useToast();
  const online = useOnline();
  const content = useQuery({
    queryKey: qk.content(id),
    queryFn: () => chaptersApi.content(id),
    staleTime: 0,
    gcTime: 0,
    retry: (n, e) => n < 2 && !(e instanceof ApiRequestError && e.status === 404),
  });
  const [text, setText] = useState<string | null>(null);
  const [title, setTitle] = useState(chapter.title);
  const version = useRef<number | undefined>(undefined);
  const ta = useRef<HTMLTextAreaElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<{ top: number; left: number } | null>(null);

  const autosave = useAutosave({
    save: async (value) => {
      let res;
      try {
        res = await chaptersApi.saveContent(id, { content: value, baseVersion: version.current });
      } catch (e) {
        if (e instanceof ApiRequestError && e.status === 409) {
          // La version distante a changé : la version de cet appareil fait foi.
          res = await chaptersApi.saveContent(id, { content: value });
          toast.show(
            'Une version plus récente existait ailleurs ; votre texte actuel a été conservé.',
          );
        } else throw e;
      }
      version.current = res.version;
      await drafts.clearIfSaved(id, value);
      const words = countWords(value);
      qc.setQueryData<ChapterDto[]>(qk.chapters(bookId), (xs) =>
        xs?.map((c) => (c.id === id ? { ...c, wordCount: words } : c)),
      );
    },
    onLocalChange: (value) =>
      void drafts.put({
        chapterId: id,
        content: value,
        baseVersion: version.current,
        updatedAt: Date.now(),
      }),
    onUnload: (value) => sendKeepalive(`/chapters/${id}/content`, 'PUT', { content: value }),
  });

  const { status: saveStatus, change, flush, reset } = autosave;
  useEffect(() => onStatus(saveStatus), [saveStatus, onStatus]);

  // Chargement : contenu serveur, ou brouillon local plus récent.
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    if (content.data) {
      loaded.current = true;
      version.current = content.data.version;
      void drafts.get(id).then((d) => {
        if (d && d.content !== content.data.content) {
          setText(d.content);
          change(d.content); // resynchronise le brouillon local
        } else {
          setText(content.data.content);
          reset('saved');
        }
      });
    } else if (content.error) {
      void drafts.get(id).then((d) => {
        if (d) {
          loaded.current = true;
          setText(d.content);
          change(d.content);
        }
      });
    }
  }, [content.data, content.error, id, change, reset]);

  // Enregistre immédiatement en quittant le chapitre.
  useEffect(() => () => void flush(), [flush]);

  // Hauteur automatique (hors mode concentration).
  useEffect(() => {
    const el = ta.current;
    if (!el || focusMode) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text, focusMode]);

  const debouncedTitle = useDebouncedCallback((t: string) => {
    if (t.trim() && t.trim() !== chapter.title) onTitle(t.trim());
  }, 800);

  const onChange = (value: string) => {
    setText(value);
    change(value);
  };

  const updateToolbar = () => {
    const el = ta.current;
    if (!el || !wrap.current) return;
    if (focusMode) centerCaret(el);
    if (el.selectionStart === el.selectionEnd || document.activeElement !== el) {
      setToolbar(null);
      return;
    }
    const c = caretCoords(el, el.selectionStart);
    const w = wrap.current.clientWidth;
    setToolbar({
      top: el.offsetTop + c.top - 8,
      left: Math.min(Math.max(el.offsetLeft + c.left, 170), w - 170),
    });
  };

  const format = (a: FormatAction) => {
    const el = ta.current;
    if (!el) return;
    const { value, selectionStart: s, selectionEnd: e } = el;
    const edit =
      a === 'bold'
        ? wrapEdit(value, s, e, '**')
        : a === 'italic'
          ? wrapEdit(value, s, e, '*')
          : a === 'heading'
            ? linePrefixEdit(value, s, e, '## ', /^#{1,3}\s+/)
            : a === 'quote'
              ? linePrefixEdit(value, s, e, '> ', /^>\s?/)
              : a === 'list'
                ? linePrefixEdit(value, s, e, '- ', /^\s*[-•]\s+/)
                : a === 'center'
                  ? centerEdit(value, s, e)
                  : sceneBreakEdit(value, e);
    applyEdit(el, edit, onChange);
    setToolbar(null);
  };

  const words = useMemo(() => countWords(text ?? ''), [text]);

  if (text === null) {
    if (content.error && !content.isFetching) {
      return (
        <div className="mx-auto max-w-lg p-6">
          <ErrorNotice
            error={
              online
                ? content.error
                : new Error(
                    'Ce chapitre n’a pas encore été ouvert sur cet appareil : il sera disponible au retour de la connexion.',
                  )
            }
            onRetry={() => content.refetch()}
          />
        </div>
      );
    }
    return <WriterSkeleton />;
  }

  return (
    <div className="flex min-h-full flex-col">
      <div
        ref={wrap}
        className="relative mx-auto w-full max-w-[72ch] flex-1 px-4 pb-24 pt-4 sm:px-8 md:pt-10"
      >
        <div className="page rounded-lg px-5 py-8 sm:px-12 sm:py-12">
          <label htmlFor="chapter-title" className="sr-only">
            Titre du chapitre
          </label>
          {/* Zone multiligne : un titre long passe à la ligne au lieu d'être coupé (mobile). */}
          <textarea
            id="chapter-title"
            rows={1}
            value={title}
            maxLength={200}
            onChange={(e) => {
              const v = e.target.value.replace(/\n/g, ' ');
              setTitle(v);
              debouncedTitle.call(v);
              autoGrow(e.currentTarget);
            }}
            ref={(el) => {
              if (el) autoGrow(el);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                ta.current?.focus();
              }
            }}
            onBlur={() => debouncedTitle.flush()}
            placeholder="Titre du chapitre"
            className="mb-6 block w-full resize-none overflow-hidden bg-transparent font-serif text-2xl font-semibold leading-tight text-fg placeholder:text-muted/60 focus:outline-none sm:text-3xl"
          />
          <label htmlFor="chapter-text" className="sr-only">
            Texte du chapitre
          </label>
          <textarea
            id="chapter-text"
            ref={ta}
            value={text}
            autoFocus={firstVisit || !text}
            spellCheck
            lang="fr"
            placeholder="Il était une fois…"
            onChange={(e) => onChange(e.target.value)}
            onSelect={updateToolbar}
            onMouseUp={updateToolbar}
            onKeyUp={updateToolbar}
            onBlur={() => window.setTimeout(() => setToolbar(null), 120)}
            onKeyDown={(e) => {
              const mod = e.ctrlKey || e.metaKey;
              if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                format('bold');
              } else if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                format('italic');
              } else if (mod && e.key.toLowerCase() === 's') {
                e.preventDefault();
                void flush();
              }
            }}
            className={cx(
              'block w-full resize-none bg-transparent font-serif text-[1.15rem] leading-[1.8] text-fg placeholder:text-muted/60 focus:outline-none',
              focusMode
                ? 'h-[calc(100dvh-18rem)] overflow-y-auto py-[30vh]'
                : 'min-h-[50vh] overflow-hidden',
            )}
            style={
              focusMode
                ? {
                    maskImage: 'linear-gradient(transparent, #000 38%, #000 62%, transparent)',
                    WebkitMaskImage:
                      'linear-gradient(transparent, #000 38%, #000 62%, transparent)',
                  }
                : undefined
            }
          />
        </div>
        <FormatToolbar pos={toolbar} onAction={format} />
      </div>
      <footer className="pointer-events-none sticky bottom-0 flex justify-center pb-3">
        <p
          className="glass pointer-events-auto rounded-full px-3 py-1 text-xs text-muted"
          aria-live="off"
        >
          {formatWords(words)} · ≈ {readingMinutes(words)} min de lecture
        </p>
      </footer>
    </div>
  );
}

function autoGrow(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

/** Mode concentration : garde la ligne en cours au centre (le reste est estompé par un masque). */
function centerCaret(el: HTMLTextAreaElement) {
  const c = caretCoords(el, el.selectionEnd);
  const target = c.top + el.scrollTop - el.clientHeight / 2 + c.lineHeight / 2;
  el.scrollTo({ top: target, behavior: 'smooth' });
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const map: Record<
    SaveStatus,
    { text: string; icon: 'check' | 'cloud' | 'cloudOff'; tone?: string }
  > = {
    idle: { text: '', icon: 'cloud' },
    dirty: { text: 'Modifications…', icon: 'cloud' },
    saving: { text: 'Enregistrement…', icon: 'cloud' },
    saved: { text: 'Enregistré', icon: 'check' },
    offline: { text: 'Hors ligne – synchronisation en attente', icon: 'cloudOff' },
    error: { text: 'Non enregistré – nouvel essai bientôt', icon: 'cloudOff', tone: 'text-danger' },
  };
  const m = map[status];
  if (!m.text) return null;
  return (
    <span
      role="status"
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-muted',
        m.tone,
      )}
      title={m.text}
    >
      <Icon
        name={m.icon}
        size={14}
        className={status === 'saved' ? 'text-accent-text' : undefined}
      />
      <span className={cx(status === 'offline' && 'hidden sm:inline')}>{m.text}</span>
    </span>
  );
}

function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3">
      <Skeleton className="mb-3 h-6 w-2/3" />
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-10" />
      ))}
    </div>
  );
}

function WriterSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[72ch] px-4 pt-10 sm:px-8">
      <div className="page flex flex-col gap-4 rounded-lg px-5 py-10 sm:px-12">
        <Skeleton className="h-9 w-1/2" />
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className={cx('h-4', i % 3 === 2 ? 'w-4/6' : 'w-full')} />
        ))}
      </div>
    </div>
  );
}
