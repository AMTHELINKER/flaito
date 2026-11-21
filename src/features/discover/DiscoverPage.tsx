import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { catalogApi, qk } from '@/api/endpoints';
import { BookCard, BookGrid, BookGridSkeleton } from '@/components/BookCard';
import { Icon } from '@/components/ui/Icon';
import { Button, EmptyState, ErrorNotice, PageHeader, Tabs, cx } from '@/components/ui/primitives';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

export function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const genre = params.get('genre') ?? '';
  const sort = (params.get('tri') as 'recent' | 'trending') || 'trending';
  const [input, setInput] = useState(q);

  useEffect(() => setInput(q), [q]);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };
  const debouncedSearch = useDebouncedCallback((v: string) => update({ q: v.trim() }), 350);

  const genres = useQuery({
    queryKey: qk.genres,
    queryFn: catalogApi.genres,
    staleTime: 5 * 60_000,
  });
  const filters = { q, genre, sort };
  const books = useInfiniteQuery({
    queryKey: qk.catalog(filters),
    queryFn: ({ pageParam }) => catalogApi.list({ ...filters, cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = books.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <PageHeader title="Découvrir" subtitle="Des histoires publiées par la communauté Laito." />
      <form
        role="search"
        className="glass mb-5 flex items-center gap-2 rounded-lg px-3"
        onSubmit={(e) => {
          e.preventDefault();
          debouncedSearch.flush();
        }}
      >
        <Icon name="search" className="text-muted" />
        <label htmlFor="search" className="sr-only">
          Rechercher par titre, auteur, genre ou mot-clé
        </label>
        <input
          id="search"
          type="search"
          value={input}
          placeholder="Titre, auteur, genre, mot-clé…"
          onChange={(e) => {
            setInput(e.target.value);
            debouncedSearch.call(e.target.value);
          }}
          className="min-h-12 flex-1 bg-transparent text-fg placeholder:text-muted/80 focus:outline-none"
        />
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          label="Tri"
          value={sort}
          onChange={(v) => update({ tri: v === 'trending' ? '' : v })}
          tabs={[
            { value: 'trending', label: 'Tendances' },
            { value: 'recent', label: 'Nouveautés' },
          ]}
        />
      </div>
      {!!genres.data?.length && (
        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Catégories">
          <GenreChip active={!genre} onClick={() => update({ genre: '' })}>
            Toutes
          </GenreChip>
          {genres.data.map((g) => (
            <GenreChip
              key={g.genre}
              active={genre === g.genre}
              onClick={() => update({ genre: genre === g.genre ? '' : g.genre })}
            >
              {g.genre[0].toUpperCase() + g.genre.slice(1)}{' '}
              <span className="text-muted">{g.count}</span>
            </GenreChip>
          ))}
        </div>
      )}

      {books.isLoading ? (
        <BookGridSkeleton count={8} />
      ) : books.error ? (
        <ErrorNotice error={books.error} onRetry={() => books.refetch()} />
      ) : items.length ? (
        <>
          <BookGrid>
            {items.map((b) => (
              <BookCard key={b.id} book={b} to={`/lire/${b.id}`} showMeta={false} />
            ))}
          </BookGrid>
          {books.hasNextPage && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="secondary"
                busy={books.isFetchingNextPage}
                onClick={() => books.fetchNextPage()}
              >
                Voir plus
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon="search"
          title="Aucun livre trouvé"
          text={
            q || genre
              ? 'Essayez un autre mot ou une autre catégorie.'
              : 'Les premiers livres publics arrivent bientôt.'
          }
        />
      )}
    </>
  );
}

function GenreChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'pressable inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm',
        active
          ? 'border-accent-text bg-page font-semibold shadow-soft'
          : 'border-line hover:bg-page/60',
      )}
    >
      {children}
    </button>
  );
}
