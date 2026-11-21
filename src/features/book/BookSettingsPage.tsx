import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  COVER_MAX_BYTES,
  COVER_MIME_TYPES,
  GENRES,
  STATUS_LABELS,
  WRITING_STATUSES,
  type BookDto,
  type ResourceType,
  type UpdateBookRequest,
  type Visibility,
} from '@laito/shared';
import { errorMessage } from '@/api/client';
import { booksApi, qk, shareApi } from '@/api/endpoints';
import { BookCover } from '@/components/BookCover';
import { VisibilityBadge, VisibilityPicker } from '@/components/badges';
import { Celebration } from '@/components/Celebration';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/Modal';
import {
  Button,
  Card,
  Disclosure,
  ErrorNotice,
  IconButton,
  PageHeader,
  Section,
  SelectField,
  Skeleton,
  Tabs,
  TextArea,
  TextField,
} from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/format';

export function BookSettingsPage() {
  const { bookId = '' } = useParams();
  const book = useQuery({ queryKey: qk.book(bookId), queryFn: () => booksApi.get(bookId) });

  if (book.error) return <ErrorNotice error={book.error} onRetry={() => book.refetch()} />;
  if (!book.data)
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64" />
      </div>
    );
  return <BookSettingsForm key={book.data.id} book={book.data} />;
}

type BookTab = 'livre' | 'partage';

function BookSettingsForm({ book }: { book: BookDto }) {
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: book.title,
    summary: book.summary ?? '',
    genre: book.genre ?? '',
    tags: book.tags.join(', '),
    status: book.status,
  });
  const [pendingPublic, setPendingPublic] = useState<Visibility | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [celebrate, setCelebrate] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [params, setParams] = useSearchParams();
  const tab: BookTab = params.get('onglet') === 'partage' ? 'partage' : 'livre';
  const setTab = (t: BookTab) => setParams(t === 'livre' ? {} : { onglet: t }, { replace: true });

  const setBook = (b: BookDto) => {
    qc.setQueryData(qk.book(b.id), b);
    void qc.invalidateQueries({ queryKey: qk.myBooks });
  };

  const update = useMutation({
    mutationFn: (patch: UpdateBookRequest) => booksApi.update(book.id, patch),
    onSuccess: (b, patch) => {
      setBook(b);
      if (patch.status === 'published' && book.status !== 'published') setCelebrate(Date.now());
      toast.success('Enregistré');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const cover = useMutation({
    mutationFn: (f: File) => booksApi.uploadCover(book.id, f),
    onSuccess: (b) => {
      setBook(b);
      toast.success('Couverture mise à jour');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const onCover = (f: File | undefined) => {
    if (!f) return;
    if (!(COVER_MIME_TYPES as readonly string[]).includes(f.type)) {
      toast.error('Format non pris en charge : choisissez une image JPG, PNG ou WebP.');
      return;
    }
    if (f.size > COVER_MAX_BYTES) {
      toast.error('Image trop lourde : 5 Mo maximum.');
      return;
    }
    cover.mutate(f);
  };

  const setVisibility = (v: Visibility) => {
    if (v === 'public' && book.visibility !== 'public') setPendingPublic(v);
    else update.mutate({ visibility: v });
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({
      title: form.title.trim() || 'Sans titre',
      summary: form.summary.trim(),
      genre: form.genre || undefined,
      tags: form.tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 10),
      status: form.status,
    });
  };

  const remove = () => {
    setConfirmDelete(false);
    navigate('/bibliotheque', { replace: true });
    const prev = qc.getQueryData<BookDto[]>(qk.myBooks);
    qc.setQueryData<BookDto[]>(qk.myBooks, (xs) => xs?.filter((b) => b.id !== book.id));
    toast.undoable(
      `« ${book.title} » supprimé.`,
      async () => {
        try {
          await booksApi.remove(book.id);
        } catch (e) {
          if (prev) qc.setQueryData(qk.myBooks, prev);
          toast.error(errorMessage(e));
        }
      },
      () => {
        if (prev) qc.setQueryData(qk.myBooks, prev);
      },
    );
  };

  const dirty =
    form.title !== book.title ||
    form.summary !== (book.summary ?? '') ||
    form.genre !== (book.genre ?? '') ||
    form.tags !== book.tags.join(', ') ||
    form.status !== book.status;

  return (
    <div className="mx-auto max-w-3xl">
      <Celebration trigger={celebrate} />
      <PageHeader
        title={book.title}
        subtitle="Réglages du livre"
        actions={
          <Link to={`/livres/${book.id}/ecrire`}>
            <Button variant="secondary" icon="pen">
              Écrire
            </Button>
          </Link>
        }
      />

      {/* Deux onglets plutôt qu'une longue page : on ne présente que les choix utiles à la tâche en cours. */}
      <Tabs
        label="Réglages du livre"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'livre', label: 'Le livre' },
          { value: 'partage', label: 'Partage' },
        ]}
      />

      {tab === 'livre' ? (
        <div role="tabpanel" aria-label="Le livre" className="flex flex-col gap-5 animate-fade-in">
          <Card as="section" aria-label="Informations">
            <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="pressable group relative rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label="Changer la couverture"
                >
                  <BookCover title={form.title} coverUrl={book.coverUrl} />
                  <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1.5 rounded-md bg-ink/70 py-1.5 text-xs text-parchment opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Icon name="image" size={14} /> {cover.isPending ? 'Envoi…' : 'Changer'}
                  </span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept={COVER_MIME_TYPES.join(',')}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(e) => {
                    onCover(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <p className="text-center text-xs text-muted">Couverture · JPG, PNG, WebP · 5 Mo</p>
              </div>
              <form onSubmit={save} className="flex flex-col gap-4">
                <TextField
                  label="Titre"
                  value={form.title}
                  maxLength={200}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <TextArea
                  label="Résumé"
                  rows={4}
                  maxLength={2000}
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                />
                <SelectField
                  label="Statut"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as BookDto['status'] })
                  }
                >
                  {WRITING_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </SelectField>
                <Disclosure
                  summary="Genre et mots-clés"
                  defaultOpen={!!(book.genre || book.tags.length)}
                >
                  <SelectField
                    label="Genre"
                    value={form.genre}
                    onChange={(e) => setForm({ ...form, genre: e.target.value })}
                  >
                    <option value="">— Aucun —</option>
                    {GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g[0].toUpperCase() + g.slice(1)}
                      </option>
                    ))}
                  </SelectField>
                  <TextField
                    label="Mots-clés"
                    hint="Séparés par des virgules (10 maximum). Ils aident les lecteurs à trouver votre livre."
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  />
                </Disclosure>
                <div className="flex items-center gap-3">
                  <Button type="submit" busy={update.isPending} disabled={!dirty}>
                    Enregistrer
                  </Button>
                  {dirty && (
                    <span className="text-sm text-muted">Modifications non enregistrées</span>
                  )}
                </div>
              </form>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              icon="trash"
              className="text-danger"
              onClick={() => setConfirmDelete(true)}
            >
              Supprimer ce livre
            </Button>
          </div>
        </div>
      ) : (
        <div role="tabpanel" aria-label="Partage" className="flex flex-col gap-5 animate-fade-in">
          <Section
            id="s-vis"
            title="Qui peut lire ce livre ?"
            description="Un chapitre privé reste privé, même dans un livre public."
            aside={<VisibilityBadge value={book.visibility} />}
          >
            <VisibilityPicker
              name="book-visibility"
              value={book.visibility}
              onChange={setVisibility}
              disabled={update.isPending}
            />
          </Section>

          {/* Les liens ne servent qu'en « Lien privé » : on ne les montre que dans ce cas. */}
          <ShareLinks
            resourceType="book"
            resourceId={book.id}
            visible={book.visibility === 'link'}
          />
          <Invitations resourceType="book" resourceId={book.id} />
        </div>
      )}

      <ConfirmDialog
        open={!!pendingPublic}
        title="Rendre ce livre public ?"
        message="Il apparaîtra dans le catalogue et sera lisible par tout le monde (sauf les chapitres que vous gardez privés). Vous pourrez le repasser en privé à tout moment."
        confirmLabel="Rendre public"
        onConfirm={() => {
          setPendingPublic(null);
          update.mutate({ visibility: 'public' });
        }}
        onCancel={() => setPendingPublic(null)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer ce livre ?"
        message={
          <>« {book.title} » sera supprimé. Vous pourrez annuler pendant quelques secondes.</>
        }
        confirmLabel="Supprimer"
        danger
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

// ───────────────────────── Liens de partage ─────────────────────────
function ShareLinks({
  resourceType,
  resourceId,
  visible,
}: {
  resourceType: ResourceType;
  resourceId: string;
  visible: boolean;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const key = qk.shareLinks(resourceType, resourceId);
  const links = useQuery({
    queryKey: key,
    queryFn: () => shareApi.links(resourceType, resourceId),
  });
  const [expiry, setExpiry] = useState<'never' | '1' | '7' | '30'>('never');

  const create = useMutation({
    mutationFn: () =>
      shareApi.createLink({
        resourceType,
        resourceId,
        expiresAt:
          expiry === 'never'
            ? null
            : new Date(Date.now() + Number(expiry) * 86400000).toISOString(),
      }),
    onSuccess: async (l) => {
      void qc.invalidateQueries({ queryKey: key });
      await copy(l.url);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => shareApi.revokeLink(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key });
      toast.success('Lien révoqué : il ne donne plus accès.');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Lien copié');
    } catch {
      toast.show(url, { duration: 8000 });
    }
  };

  const active = (links.data ?? []).filter(
    (l) => !l.revokedAt && (!l.expiresAt || new Date(l.expiresAt) > new Date()),
  );

  // Masqué hors « Lien privé », sauf s'il reste des liens actifs à révoquer.
  if (!visible && !active.length) return null;

  return (
    <Section
      id="s-links"
      title="Liens privés"
      description="Toute personne disposant d’un lien peut lire, sans compte. Révocable à tout moment."
    >
      {links.isLoading ? (
        <Skeleton className="h-12" />
      ) : (
        !!active.length && (
          <ul className="mb-4 flex flex-col gap-2">
            {active.map((l) => (
              <li
                key={l.id}
                className="flex items-center gap-2 rounded-md border border-line bg-page/70 p-2 pl-3"
              >
                <Icon name="link" size={16} className="shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs">{l.url}</p>
                  <p className="text-xs text-muted">
                    {l.expiresAt ? `Expire le ${formatDate(l.expiresAt)}` : 'Sans expiration'}
                  </p>
                </div>
                <IconButton icon="copy" label="Copier le lien" onClick={() => copy(l.url)} />
                <IconButton icon="x" label="Révoquer le lien" onClick={() => revoke.mutate(l.id)} />
              </li>
            ))}
          </ul>
        )
      )}
      {visible && (
        <div className="flex flex-wrap items-end gap-3">
          <SelectField
            label="Expiration"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value as typeof expiry)}
            className="w-44"
          >
            <option value="never">Jamais</option>
            <option value="1">Dans 24 heures</option>
            <option value="7">Dans 7 jours</option>
            <option value="30">Dans 30 jours</option>
          </SelectField>
          <Button
            variant="secondary"
            icon="link"
            busy={create.isPending}
            onClick={() => create.mutate()}
          >
            {active.length ? 'Nouveau lien' : 'Créer et copier un lien'}
          </Button>
        </div>
      )}
    </Section>
  );
}

// ───────────────────────── Invitations ─────────────────────────
function Invitations({
  resourceType,
  resourceId,
}: {
  resourceType: ResourceType;
  resourceId: string;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const key = qk.grants(resourceType, resourceId);
  const grants = useQuery({
    queryKey: key,
    queryFn: () => shareApi.grants(resourceType, resourceId),
  });
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setError(null), [username]);

  const invite = useMutation({
    mutationFn: () =>
      shareApi.createGrant({
        resourceType,
        resourceId,
        username: username.trim().replace(/^@/, ''),
        permission: 'read',
      }),
    onSuccess: (g) => {
      setUsername('');
      void qc.invalidateQueries({ queryKey: key });
      toast.success(`${g.grantee.displayName} peut maintenant lire ce livre.`);
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => shareApi.removeGrant(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key });
      toast.success('Accès retiré.');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Section
      id="s-inv"
      title="Lecteurs invités"
      description="Ouvrez ce livre à des personnes précises, quelle que soit sa visibilité."
    >
      {grants.isLoading ? (
        <Skeleton className="mb-4 h-12" />
      ) : (
        !!grants.data?.length && (
          <ul className="mb-4 flex flex-col gap-2">
            {grants.data.map((g) => (
              <li
                key={g.id}
                className="flex items-center gap-3 rounded-md border border-line bg-page/70 p-2 pl-3"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface font-serif">
                  {g.grantee.displayName[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{g.grantee.displayName}</p>
                  <p className="text-xs text-muted">@{g.grantee.username}</p>
                </div>
                <IconButton
                  icon="x"
                  label={`Retirer l’accès de ${g.grantee.displayName}`}
                  onClick={() => remove.mutate(g.id)}
                />
              </li>
            ))}
          </ul>
        )
      )}
      <form
        className="flex flex-wrap items-start gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (username.trim()) invite.mutate();
        }}
      >
        <TextField
          label="Pseudo du lecteur"
          placeholder="@pseudo"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={error}
          className="min-w-56 flex-1"
        />
        <Button
          type="submit"
          variant="secondary"
          icon="users"
          busy={invite.isPending}
          disabled={!username.trim()}
          className="sm:mt-7"
        >
          Inviter
        </Button>
      </form>
    </Section>
  );
}
