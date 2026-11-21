import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GENRES, readingMinutes, type BookDto } from '@laito/shared';
import { booksApi, catalogApi, qk, readApi, shareApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { BookCard, BookGrid, BookGridSkeleton } from '@/components/BookCard';
import { BookCover } from '@/components/BookCover';
import { Icon } from '@/components/ui/Icon';
import {
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  SelectField,
  Skeleton,
  Tabs,
  TextArea,
  TextField,
} from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { timeAgo } from '@/lib/format';

// ───────────────────────── Accueil ─────────────────────────
export function HomePage() {
  const { user } = useAuth();
  const books = useQuery({ queryKey: qk.myBooks, queryFn: booksApi.mine });
  const progress = useQuery({ queryKey: qk.progress, queryFn: readApi.progress });
  const suggestions = useQuery({
    queryKey: qk.catalog({ sort: 'trending', limit: 8 }),
    queryFn: () => catalogApi.list({ sort: 'trending', limit: 8 }),
  });

  const lastWritten = [...(books.data ?? [])].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )[0];
  const lastRead = progress.data?.[0];
  const hour = new Date().getHours();
  const greet = hour < 6 || hour >= 19 ? 'Bonsoir' : 'Bonjour';

  return (
    <>
      <PageHeader
        title={`${greet}, ${user?.profile.displayName ?? ''}`}
        subtitle="Votre carnet vous attend."
      />

      <section aria-labelledby="reprendre" className="mb-10">
        <h2 id="reprendre" className="mb-3 text-xl">
          Reprendre
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {books.isLoading ? (
            <Skeleton className="h-32" />
          ) : lastWritten ? (
            <ResumeCard
              to={`/livres/${lastWritten.id}/ecrire`}
              book={lastWritten}
              kicker="Écriture"
              detail={`Modifié ${timeAgo(lastWritten.updatedAt)}`}
              action="Continuer d’écrire"
            />
          ) : (
            <Card className="flex flex-col items-start justify-center gap-3">
              <p className="font-serif text-lg">
                Aucun livre pour l’instant – commencez votre premier chapitre.
              </p>
              <Link to="/ecrire">
                <Button icon="pen">Créer mon premier livre</Button>
              </Link>
            </Card>
          )}
          {progress.isLoading ? (
            <Skeleton className="h-32" />
          ) : lastRead ? (
            <ResumeCard
              to={`/lire/${lastRead.book.id}/${lastRead.chapterId}`}
              book={lastRead.book}
              kicker="Lecture"
              detail={`Lu ${timeAgo(lastRead.updatedAt)}`}
              action="Reprendre la lecture"
            />
          ) : (
            <Card className="flex flex-col items-start justify-center gap-3">
              <p className="font-serif text-lg">Aucune lecture en cours.</p>
              <Link to="/decouvrir">
                <Button variant="secondary" icon="compass">
                  Découvrir des livres
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </section>

      <section aria-labelledby="suggestions">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="suggestions" className="text-xl">
            Suggestions
          </h2>
          <Link
            to="/decouvrir"
            className="text-sm text-accent-text underline-offset-2 hover:underline"
          >
            Tout voir
          </Link>
        </div>
        {suggestions.isLoading ? (
          <BookGridSkeleton />
        ) : suggestions.error ? (
          <ErrorNotice error={suggestions.error} onRetry={() => suggestions.refetch()} />
        ) : suggestions.data?.items.length ? (
          <BookGrid>
            {suggestions.data.items.map((b) => (
              <BookCard key={b.id} book={b} to={`/lire/${b.id}`} showMeta={false} />
            ))}
          </BookGrid>
        ) : (
          <EmptyState
            icon="compass"
            title="Le catalogue se remplit doucement"
            text="Les premiers livres publics apparaîtront ici."
          />
        )}
      </section>
    </>
  );
}

function ResumeCard({
  to,
  book,
  kicker,
  detail,
  action,
}: {
  to: string;
  book: BookDto;
  kicker: string;
  detail: string;
  action: string;
}) {
  return (
    <Link to={to} className="glass pressable flex gap-4 rounded-lg p-4 hover:shadow-lg">
      <div className="w-20 shrink-0">
        <BookCover title={book.title} coverUrl={book.coverUrl} />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-accent-text">
          {kicker}
        </span>
        <h3 className="truncate text-lg">{book.title}</h3>
        <p className="text-sm text-muted">{detail}</p>
        <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium">
          {action} <Icon name="chevronRight" size={16} />
        </span>
      </div>
    </Link>
  );
}

// ───────────────────────── Bibliothèque ─────────────────────────
type LibTab = 'books' | 'reading' | 'shared';

export function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('onglet') as LibTab) || 'books';
  const setTab = (t: LibTab) => setParams({ onglet: t }, { replace: true });

  return (
    <>
      <PageHeader
        title="Bibliothèque"
        actions={
          <Link to="/ecrire">
            <Button icon="plus">Nouveau livre</Button>
          </Link>
        }
      />
      <Tabs
        label="Sections de la bibliothèque"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'books', label: 'Mes livres' },
          { value: 'reading', label: 'Mes lectures' },
          { value: 'shared', label: 'Partagés' },
        ]}
      />
      {tab === 'books' && <MyBooks />}
      {tab === 'reading' && <MyReadings />}
      {tab === 'shared' && <SharedWithMe />}
    </>
  );
}

function MyBooks() {
  const q = useQuery({ queryKey: qk.myBooks, queryFn: booksApi.mine });
  if (q.isLoading) return <BookGridSkeleton />;
  if (q.error) return <ErrorNotice error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data?.length)
    return (
      <EmptyState
        title="Aucun livre pour l’instant"
        text="Commencez votre premier chapitre : il restera privé tant que vous le souhaitez."
        action={
          <Link to="/ecrire">
            <Button icon="pen">Commencer à écrire</Button>
          </Link>
        }
      />
    );
  return (
    <BookGrid>
      {q.data.map((b) => (
        <BookCard key={b.id} book={b} to={`/livres/${b.id}/ecrire`} />
      ))}
    </BookGrid>
  );
}

function MyReadings() {
  const q = useQuery({ queryKey: qk.progress, queryFn: readApi.progress });
  if (q.isLoading) return <BookGridSkeleton />;
  if (q.error) return <ErrorNotice error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data?.length)
    return (
      <EmptyState
        icon="bookOpen"
        title="Aucune lecture en cours"
        text="Les livres que vous ouvrez apparaîtront ici, avec votre progression."
        action={
          <Link to="/decouvrir">
            <Button variant="secondary">Découvrir des livres</Button>
          </Link>
        }
      />
    );
  return (
    <ul className="flex flex-col gap-3">
      {q.data.map((p) => (
        <li key={p.bookId}>
          <Link
            to={`/lire/${p.bookId}/${p.chapterId}`}
            className="glass pressable flex items-center gap-4 rounded-lg p-3"
          >
            <div className="w-14 shrink-0">
              <BookCover title={p.book.title} coverUrl={p.book.coverUrl} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate">{p.book.title}</h3>
              {p.book.author && <p className="text-sm text-muted">{p.book.author.displayName}</p>}
              <p className="text-xs text-muted">
                Lu {timeAgo(p.updatedAt)} · ≈ {readingMinutes(p.book.wordCount)} min au total
              </p>
            </div>
            <Icon name="chevronRight" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SharedWithMe() {
  const q = useQuery({ queryKey: qk.sharedWithMe, queryFn: shareApi.withMe });
  if (q.isLoading) return <BookGridSkeleton />;
  if (q.error) return <ErrorNotice error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data?.length)
    return (
      <EmptyState
        icon="users"
        title="Rien de partagé pour l’instant"
        text="Quand un auteur vous invite à lire, son livre apparaît ici."
      />
    );
  return (
    <BookGrid>
      {q.data.map((b) => (
        <BookCard key={b.id} book={b} to={`/lire/${b.id}`} showMeta={false} />
      ))}
    </BookGrid>
  );
}

// ───────────────────────── Nouveau livre ─────────────────────────
export function NewBookPage() {
  const [params] = useSearchParams();
  const first = params.get('premier') === '1';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [genre, setGenre] = useState('');
  const [more, setMore] = useState(false);

  const create = useMutation({
    mutationFn: async () => {
      const book = await booksApi.create({
        title: title.trim() || 'Sans titre',
        summary: summary.trim() || undefined,
        genre: genre || undefined,
      });
      const chapter = await booksApi.createChapter(book.id, { title: 'Chapitre 1' });
      return { book, chapter };
    },
    onSuccess: ({ book, chapter }) => {
      void qc.invalidateQueries({ queryKey: qk.myBooks });
      navigate(`/livres/${book.id}/ecrire/${chapter.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title={first ? 'Créer mon premier livre' : 'Nouveau livre'}
        subtitle="Il sera privé par défaut. Vous pourrez tout modifier ensuite."
      />
      <Card className="p-6">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <TextField
            label="Titre"
            autoFocus
            placeholder="Le titre de votre livre"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            className="[&_input]:font-serif [&_input]:text-lg"
          />
          {more ? (
            <>
              <TextArea
                label="Résumé"
                rows={3}
                value={summary}
                maxLength={2000}
                onChange={(e) => setSummary(e.target.value)}
              />
              <SelectField label="Genre" value={genre} onChange={(e) => setGenre(e.target.value)}>
                <option value="">— Choisir —</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g[0].toUpperCase() + g.slice(1)}
                  </option>
                ))}
              </SelectField>
            </>
          ) : (
            <button
              type="button"
              className="self-start text-sm text-accent-text underline-offset-2 hover:underline"
              onClick={() => setMore(true)}
            >
              Ajouter un résumé et un genre (facultatif)
            </button>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" icon="feather" busy={create.isPending}>
              Commencer à écrire
            </Button>
            <span className="inline-flex items-center gap-1 text-sm text-muted">
              <Icon name="lock" size={14} /> Privé par défaut
            </span>
          </div>
        </form>
      </Card>
    </div>
  );
}
