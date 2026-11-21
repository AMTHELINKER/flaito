import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  READING_PROGRESS_INTERVAL_MS,
  WORDS_PER_MINUTE,
  type ChapterDto,
  type ReadingPreferences,
} from '@laito/shared';
import { ApiRequestError, sendKeepalive } from '@/api/client';
import { qk, readApi } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { ChapterText } from '@/components/ChapterText';
import { Icon } from '@/components/ui/Icon';
import { Button, ErrorNotice, IconButton, Skeleton, cx } from '@/components/ui/primitives';
import { useReadingPrefs } from '@/hooks/useReadingPrefs';
import { ReaderSettings } from './ReaderSettings';

const FONT: Record<ReadingPreferences['fontFamily'], string> = {
  literata: "'Literata', Georgia, serif",
  lora: "'Lora', Georgia, serif",
  inter: "'Inter', system-ui, sans-serif",
};
const MEASURE: Record<ReadingPreferences['margin'], string> = {
  narrow: '75ch',
  normal: '66ch',
  wide: '56ch',
};

export function ReaderPage() {
  const { bookId = '', chapterId } = useParams();
  const [params] = useSearchParams();
  const share = params.get('share') ?? undefined;
  const suffix = share ? `?share=${encodeURIComponent(share)}` : '';

  const book = useQuery({
    queryKey: qk.readBook(bookId, share),
    queryFn: () => readApi.book(bookId, share),
    retry: (n, e) => n < 2 && !(e instanceof ApiRequestError && e.status === 404),
  });

  if (book.error) return <ReaderError error={book.error} />;
  if (!book.data) return <ReaderSkeleton />;

  if (!chapterId) {
    const first = book.data.progress?.chapterId ?? book.data.chapters[0]?.id;
    if (!first) {
      return (
        <ReaderError
          error={new Error('Ce livre ne contient pas encore de chapitre lisible. Revenez bientôt !')}
        />
      );
    }
    return <Navigate to={`/lire/${bookId}/${first}${suffix}`} replace />;
  }

  return (
    <ChapterReader
      key={chapterId}
      bookId={bookId}
      chapterId={chapterId}
      share={share}
      suffix={suffix}
      bookTitle={book.data.book.title}
      chapters={book.data.chapters}
      isOwner={book.data.isOwner}
      resumeAt={book.data.progress?.chapterId === chapterId ? book.data.progress.position : 0}
    />
  );
}

function ChapterReader({
  bookId,
  chapterId,
  share,
  suffix,
  bookTitle,
  chapters,
  isOwner,
  resumeAt,
}: {
  bookId: string;
  chapterId: string;
  share?: string;
  suffix: string;
  bookTitle: string;
  chapters: ChapterDto[];
  isOwner: boolean;
  resumeAt: number;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [prefs, setPrefs] = useReadingPrefs();
  const chapter = useQuery({
    queryKey: qk.readChapter(chapterId, share),
    queryFn: () => readApi.chapter(chapterId, share),
    retry: (n, e) => n < 2 && !(e instanceof ApiRequestError && e.status === 404),
  });

  const [ui, setUi] = useState(true);
  const [panel, setPanel] = useState<'settings' | 'chapters' | null>(null);
  const [progress, setProgress] = useState(0);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [turn, setTurn] = useState<'next' | 'prev' | null>(null);
  const [vw, setVw] = useState(600);
  const viewport = useRef<HTMLDivElement>(null);
  const columns = useRef<HTMLDivElement>(null);
  const position = useRef(resumeAt);
  const lastSent = useRef<number | null>(null);
  const restored = useRef(false);
  const paged = prefs.mode === 'paged';

  const index = chapters.findIndex((c) => c.id === chapterId);
  const data = chapter.data;
  const goChapter = useCallback(
    (id: string | null | undefined) => {
      if (id) navigate(`/lire/${bookId}/${id}${suffix}`);
    },
    [navigate, bookId, suffix],
  );

  // ─── Pagination (mode pages tournées) ───
  const GAP = 48;
  const stride = vw + GAP; // largeur d'une page + écart de colonnes
  const measure = useCallback(() => {
    const c = columns.current;
    const v = viewport.current;
    if (!c || !v || !paged) return;
    const w = v.clientWidth;
    setVw(w);
    requestAnimationFrame(() => {
      const n = Math.max(1, Math.round((c.scrollWidth + GAP) / (w + GAP)));
      setPages(n);
      setPage((p) => Math.min(p, n - 1));
    });
  }, [paged]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (viewport.current) ro.observe(viewport.current);
    return () => ro.disconnect();
  }, [measure, data, prefs.fontSize, prefs.lineHeight, prefs.margin, prefs.fontFamily]);

  // ─── Position courante (index du bloc en haut de l'écran) ───
  const computePosition = useCallback(() => {
    const blocks = document.querySelectorAll<HTMLElement>('[data-block]');
    if (!blocks.length) return 0;
    if (paged) {
      const v = viewport.current?.getBoundingClientRect();
      if (!v) return 0;
      for (const b of blocks) {
        const r = b.getBoundingClientRect();
        if (r.right > v.left + 4 && r.left < v.right) return Number(b.dataset.block);
      }
      return 0;
    }
    const top = window.innerHeight * 0.2;
    for (const b of blocks) {
      if (b.getBoundingClientRect().bottom > top) return Number(b.dataset.block);
    }
    return Number(blocks[blocks.length - 1].dataset.block);
  }, [paged]);

  // ─── Reprise au bon paragraphe ───
  useEffect(() => {
    if (!data || restored.current) return;
    restored.current = true;
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-block="${resumeAt}"]`);
      if (!el || resumeAt <= 0) {
        window.scrollTo({ top: 0 });
        return;
      }
      if (paged && viewport.current && columns.current) {
        setPage(Math.floor(el.offsetLeft / (viewport.current.clientWidth + GAP)));
      } else {
        const y = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.15;
        window.scrollTo({ top: y });
      }
    });
  }, [data, resumeAt, paged]);

  // ─── Progression et masquage de l'interface en mode défilement ───
  useEffect(() => {
    if (paged) return;
    let raf = 0;
    let lastY = window.scrollY;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 1);
        position.current = computePosition();
        if (window.scrollY > lastY + 12 && window.scrollY > 120) {
          setUi(false);
          setPanel(null);
        }
        lastY = window.scrollY;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [paged, computePosition, data]);

  useEffect(() => {
    if (!paged) return;
    setProgress(pages > 1 ? page / (pages - 1) : 1);
    const t = window.setTimeout(() => (position.current = computePosition()), 380);
    return () => window.clearTimeout(t);
  }, [paged, page, pages, computePosition]);

  // ─── Enregistrement de la progression : au plus toutes les 10 s, et à la fermeture ───
  const canSave = !!user && !!data;
  useEffect(() => {
    if (!canSave) return;
    const send = () => {
      if (lastSent.current === position.current) return;
      lastSent.current = position.current;
      void readApi
        .saveProgress({ bookId, chapterId, position: position.current })
        .then(() => qc.invalidateQueries({ queryKey: qk.progress }))
        .catch(() => (lastSent.current = null));
    };
    send();
    const iv = window.setInterval(send, READING_PROGRESS_INTERVAL_MS);
    const onPageHide = () =>
      sendKeepalive('/read/progress', 'PUT', { bookId, chapterId, position: position.current });
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onPageHide();
    };
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibility);
      if (lastSent.current !== position.current) {
        void readApi.saveProgress({ bookId, chapterId, position: position.current }).catch(() => undefined);
      }
    };
  }, [canSave, bookId, chapterId, qc]);

  // ─── Navigation pages / chapitres ───
  const next = useCallback(() => {
    if (paged && page < pages - 1) {
      setTurn('next');
      setPage((p) => p + 1);
    } else goChapter(data?.nextChapterId);
  }, [paged, page, pages, goChapter, data]);
  const prev = useCallback(() => {
    if (paged && page > 0) {
      setTurn('prev');
      setPage((p) => p - 1);
    } else goChapter(data?.previousChapterId);
  }, [paged, page, goChapter, data]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return;
      if (e.key === 'ArrowRight' || (paged && (e.key === ' ' || e.key === 'PageDown'))) {
        if (paged || e.key === 'ArrowRight') {
          e.preventDefault();
          next();
        }
      } else if (e.key === 'ArrowLeft' || (paged && e.key === 'PageUp')) {
        e.preventDefault();
        prev();
      } else if (e.key === 'Escape') {
        setPanel(null);
        setUi((u) => !u);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, paged]);

  // Gestes : glisser pour changer de page / de chapitre ; toucher pour afficher l'interface.
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 50 && Date.now() - s.t < 600) {
      if (dx < 0) next();
      else prev();
    }
  };
  const onTap = (e: React.MouseEvent) => {
    if (window.getSelection()?.toString()) return;
    if ((e.target as HTMLElement).closest('a, button')) return;
    if (paged) {
      const x = e.clientX / window.innerWidth;
      if (x > 0.7) return next();
      if (x < 0.3) return prev();
    }
    setUi((u) => !u);
    setPanel(null);
  };

  const remainingMin = data
    ? Math.max(0, Math.ceil((data.chapter.wordCount * (1 - progress)) / WORDS_PER_MINUTE))
    : 0;

  return (
    <div
      className="reader min-h-dvh"
      data-reader-theme={prefs.theme}
      style={{ background: 'var(--r-bg)', color: 'var(--r-fg)' }}
    >
      {/* Barre de progression fine */}
      <div className="fixed inset-x-0 top-0 z-40 h-0.5" aria-hidden>
        <div className="h-full origin-left bg-[var(--r-ornament)] transition-transform duration-200" style={{ transform: `scaleX(${progress})` }} />
      </div>

      {/* Interface : disparaît pendant la lecture, revient d'un toucher */}
      <header
        className={cx(
          'glass fixed inset-x-2 top-2 z-30 flex items-center gap-1 rounded-xl px-1 py-1 transition-[opacity,transform] duration-200 sm:inset-x-4',
          ui ? 'opacity-100' : 'pointer-events-none -translate-y-3 opacity-0',
        )}
        style={{ color: 'var(--r-fg)' }}
      >
        <Link
          to={isOwner ? `/livres/${bookId}/ecrire/${chapterId}` : '/bibliotheque?onglet=reading'}
          aria-label={isOwner ? 'Retour à l’éditeur' : 'Retour'}
          className="pressable inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-black/5"
          tabIndex={ui ? 0 : -1}
        >
          <Icon name="chevronLeft" />
        </Link>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate font-serif text-sm font-semibold">{bookTitle}</p>
          <p className="truncate text-xs" style={{ color: 'var(--r-muted)' }}>
            {data?.chapter.title}
          </p>
        </div>
        <IconButton
          icon="list"
          label="Chapitres"
          tabIndex={ui ? 0 : -1}
          active={panel === 'chapters'}
          onClick={() => setPanel(panel === 'chapters' ? null : 'chapters')}
          className="text-[inherit]"
        />
        <IconButton
          icon="type"
          label="Réglages de lecture"
          tabIndex={ui ? 0 : -1}
          active={panel === 'settings'}
          onClick={() => setPanel(panel === 'settings' ? null : 'settings')}
          className="text-[inherit]"
        />
      </header>

      {panel === 'settings' && <ReaderSettings prefs={prefs} onChange={setPrefs} onClose={() => setPanel(null)} />}
      {panel === 'chapters' && (
        <nav
          aria-label="Table des matières"
          className="glass fixed right-2 top-16 z-30 max-h-[70dvh] w-[min(22rem,calc(100vw-1rem))] overflow-y-auto rounded-xl p-2 animate-rise sm:right-4"
          style={{ color: 'var(--r-fg)' }}
        >
          <ol>
            {chapters.map((c, i) => (
              <li key={c.id}>
                <Link
                  to={`/lire/${bookId}/${c.id}${suffix}`}
                  aria-current={c.id === chapterId ? 'page' : undefined}
                  onClick={() => setPanel(null)}
                  className={cx(
                    'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm hover:bg-black/5',
                    c.id === chapterId && 'font-semibold',
                  )}
                >
                  <span className="w-6 text-right tabular-nums" style={{ color: 'var(--r-muted)' }}>
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate">{c.title}</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <main
        id="contenu"
        onClick={onTap}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={cx('mx-auto px-3 sm:px-6', paged ? 'flex h-dvh flex-col pb-14 pt-16' : 'pb-28 pt-20')}
        style={{ maxWidth: `calc(${MEASURE[prefs.margin]} + 6rem)` }}
      >
        {chapter.error ? (
          <ReaderError error={chapter.error} inline />
        ) : !data ? (
          <div className="flex flex-col gap-4 px-6 pt-10">
            <Skeleton className="mx-auto h-8 w-1/2" />
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} className="h-4" />
            ))}
          </div>
        ) : (
          <article
            lang="fr"
            className={cx('prose-book rounded-lg px-5 sm:px-12', paged ? 'min-h-0 flex-1 py-8' : 'py-10 sm:py-14')}
            style={{
              background: 'var(--r-page)',
              fontFamily: FONT[prefs.fontFamily],
              fontSize: prefs.fontSize,
              lineHeight: prefs.lineHeight,
              textAlign: prefs.justify ? 'justify' : 'start',
              boxShadow: '0 1px 2px rgb(0 0 0 / 0.05), 0 8px 30px rgb(0 0 0 / 0.06)',
            }}
          >
            <div ref={viewport} className={cx(paged && 'h-full overflow-hidden')} style={{ perspective: 1200 }}>
              <div
                key={paged ? `p${page}` : 'scroll'}
                className={cx(
                  paged && 'h-full',
                  paged && turn === 'next' && '[animation:page-turn-next_320ms_var(--ease-soft)]',
                  paged && turn === 'prev' && '[animation:page-turn-prev_320ms_var(--ease-soft)]',
                )}
              >
              <div
                ref={columns}
                className="relative"
                style={
                  paged
                    ? {
                        height: '100%',
                        columnWidth: vw,
                        columnGap: GAP,
                        columnFill: 'auto',
                        transform: `translateX(-${page * stride}px)`,
                      }
                    : undefined
                }
              >
                <header className="mb-10 text-center" style={{ textAlign: 'center', breakInside: 'avoid' }}>
                  <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--r-muted)', fontFamily: 'Inter, sans-serif' }}>
                    Chapitre {index + 1}
                  </p>
                  <h1 className="!mt-2 !mb-3" style={{ fontSize: '1.7em' }}>
                    {data.chapter.title}
                  </h1>
                  <p aria-hidden style={{ color: 'var(--r-ornament)' }}>
                    ⁂
                  </p>
                </header>
                <ChapterText content={data.content} />
                {!data.nextChapterId && (
                  <p className="scene-break" aria-label="Fin">
                    ❦ Fin ❦
                  </p>
                )}
              </div>
              </div>
            </div>
          </article>
        )}

        {/* Fin de chapitre (défilement) */}
        {data && !paged && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            {data.previousChapterId ? (
              <Button variant="ghost" icon="chevronLeft" onClick={() => goChapter(data.previousChapterId)} className="text-[inherit]">
                Précédent
              </Button>
            ) : (
              <span />
            )}
            {data.nextChapterId && (
              <Button onClick={() => goChapter(data.nextChapterId)}>
                Chapitre suivant <Icon name="chevronRight" size={18} />
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Pied : temps restant */}
      <footer
        className={cx(
          'pointer-events-none fixed inset-x-0 bottom-2 z-20 flex justify-center transition-opacity duration-200',
          ui || paged ? 'opacity-100' : 'opacity-0',
        )}
      >
        <p className="glass rounded-full px-3 py-1 text-xs" style={{ color: 'var(--r-muted)' }} aria-live="off">
          {paged && `Page ${page + 1} / ${pages} · `}
          {remainingMin > 0 ? `${remainingMin} min restantes dans ce chapitre` : 'Fin du chapitre'}
        </p>
      </footer>
    </div>
  );
}

function ReaderError({ error, inline }: { error: unknown; inline?: boolean }) {
  const notFound = error instanceof ApiRequestError && error.status === 404;
  const content = (
    <div className="flex flex-col items-start gap-4">
      {notFound ? (
        <>
          <h1 className="text-2xl">Ce livre est introuvable</h1>
          <p className="text-muted">Il n’existe pas, ou il n’est pas partagé avec vous. Si on vous a donné un lien, il a peut-être expiré.</p>
        </>
      ) : (
        <ErrorNotice error={error} />
      )}
      <Link to="/" className="text-accent-text underline-offset-2 hover:underline">
        Retour à l’accueil
      </Link>
    </div>
  );
  if (inline) return <div className="p-6">{content}</div>;
  return <div className="mx-auto flex min-h-dvh max-w-lg items-center px-6">{content}</div>;
}

function ReaderSkeleton() {
  return (
    <div className="mx-auto flex max-w-[66ch] flex-col gap-4 px-6 pt-24">
      <Skeleton className="mx-auto h-8 w-1/2" />
      {Array.from({ length: 12 }, (_, i) => (
        <Skeleton key={i} className="h-4" />
      ))}
    </div>
  );
}
