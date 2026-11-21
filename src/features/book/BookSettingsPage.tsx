import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  ErrorNotice,
  IconButton,
  PageHeader,
  SelectField,
  Skeleton,
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

  return (
    <div className="mx-auto max-w-3xl">
      <Celebration trigger={celebrate} />
      <PageHeader
        title="Réglages du livre"
        subtitle={book.title}
        actions={
          <Link to={`/livres/${book.id}/ecrire`}>
            <Button variant="secondary" icon="pen">
              Écrire
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-5">
        <Card as="section" aria-labelledby="s-info">
          <h2 id="s-info" className="mb-4 text-xl">
            Informations
          </h2>
          <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
            <div className="flex flex-col gap-2">
              <BookCover title={form.title} coverUrl={book.coverUrl} />
              <input
                ref={fileRef}
                type="file"
                accept={COVER_MIME_TYPES.join(',')}
                className="sr-only"
                aria-label="Choisir une couverture"
                onChange={(e) => {
                  onCover(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <Button variant="secondary" size="sm" icon="image" busy={cover.isPending} onClick={() => fileRef.current?.click()}>
                Couverture
              </Button>
              <p className="text-xs text-muted">JPG, PNG ou WebP · 5 Mo max.</p>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="Genre" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}>
                  <option value="">— Aucun —</option>
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g[0].toUpperCase() + g.slice(1)}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Statut"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as BookDto['status'] })}
                >
                  {WRITING_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </SelectField>
              </div>
              <TextField
                label="Mots-clés"
                hint="Séparés par des virgules (10 maximum)."
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
              <div>
                <Button type="submit" busy={update.isPending}>
                  Enregistrer
                </Button>
              </div>
            </form>
          </div>
        </Card>

        <Card as="section" aria-labelledby="s-vis">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 id="s-vis" className="text-xl">
              Qui peut lire ce livre ?
            </h2>
            <VisibilityBadge value={book.visibility} />
          </div>
          <p className="mb-4 text-sm text-muted">
            Chaque chapitre a aussi sa propre visibilité (dans l’éditeur) : un chapitre privé reste privé, même dans un livre public.
          </p>
          <VisibilityPicker name="book-visibility" value={book.visibility} onChange={setVisibility} disabled={update.isPending} />
        </Card>

        <ShareLinks resourceType="book" resourceId={book.id} />
        <Invitations resourceType="book" resourceId={book.id} />

        <Card as="section" aria-labelledby="s-danger" className="border-danger/30">
          <h2 id="s-danger" className="mb-2 text-xl">
            Supprimer le livre
          </h2>
          <p className="mb-4 text-sm text-muted">Le livre et ses chapitres disparaîtront de votre bibliothèque et des liens de partage.</p>
          <Button variant="danger" icon="trash" onClick={() => setConfirmDelete(true)}>
            Supprimer ce livre
          </Button>
        </Card>
      </div>

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
        message={<>« {book.title} » sera supprimé. Vous pourrez annuler pendant quelques secondes.</>}
        confirmLabel="Supprimer"
        danger
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

// ───────────────────────── Liens de partage ─────────────────────────
function ShareLinks({ resourceType, resourceId }: { resourceType: ResourceType; resourceId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const key = qk.shareLinks(resourceType, resourceId);
  const links = useQuery({ queryKey: key, queryFn: () => shareApi.links(resourceType, resourceId) });
  const [expiry, setExpiry] = useState<'never' | '1' | '7' | '30'>('never');

  const create = useMutation({
    mutationFn: () =>
      shareApi.createLink({
        resourceType,
        resourceId,
        expiresAt: expiry === 'never' ? null : new Date(Date.now() + Number(expiry) * 86400000).toISOString(),
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

  const active = (links.data ?? []).filter((l) => !l.revokedAt && (!l.expiresAt || new Date(l.expiresAt) > new Date()));

  return (
    <Card as="section" aria-labelledby="s-links">
      <h2 id="s-links" className="mb-1 text-xl">
        Liens privés
      </h2>
      <p className="mb-4 text-sm text-muted">
        Toute personne disposant d’un lien peut lire, sans compte. Révoquez-le à tout moment.
      </p>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SelectField label="Expiration" value={expiry} onChange={(e) => setExpiry(e.target.value as typeof expiry)} className="w-44">
          <option value="never">Jamais</option>
          <option value="1">Dans 24 heures</option>
          <option value="7">Dans 7 jours</option>
          <option value="30">Dans 30 jours</option>
        </SelectField>
        <Button icon="link" busy={create.isPending} onClick={() => create.mutate()}>
          Créer un lien
        </Button>
      </div>
      {links.isLoading ? (
        <Skeleton className="h-12" />
      ) : active.length ? (
        <ul className="flex flex-col gap-2">
          {active.map((l) => (
            <li key={l.id} className="flex items-center gap-2 rounded-md border border-line bg-page/70 p-2 pl-3">
              <Icon name="link" size={16} className="shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs">{l.url}</p>
                <p className="text-xs text-muted">
                  Créé le {formatDate(l.createdAt)} · {l.expiresAt ? `expire le ${formatDate(l.expiresAt)}` : 'sans expiration'}
                </p>
              </div>
              <IconButton icon="copy" label="Copier le lien" onClick={() => copy(l.url)} />
              <IconButton icon="x" label="Révoquer le lien" onClick={() => revoke.mutate(l.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Aucun lien actif.</p>
      )}
    </Card>
  );
}

// ───────────────────────── Invitations ─────────────────────────
function Invitations({ resourceType, resourceId }: { resourceType: ResourceType; resourceId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const key = qk.grants(resourceType, resourceId);
  const grants = useQuery({ queryKey: key, queryFn: () => shareApi.grants(resourceType, resourceId) });
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setError(null), [username]);

  const invite = useMutation({
    mutationFn: () => shareApi.createGrant({ resourceType, resourceId, username: username.trim().replace(/^@/, ''), permission: 'read' }),
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
    <Card as="section" aria-labelledby="s-inv">
      <h2 id="s-inv" className="mb-1 text-xl">
        Lecteurs invités
      </h2>
      <p className="mb-4 text-sm text-muted">Invitez des lecteurs précis par leur pseudo, quelle que soit la visibilité.</p>
      <form
        className="mb-4 flex flex-wrap items-start gap-3"
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
        <Button type="submit" icon="users" busy={invite.isPending} className="sm:mt-7">
          Inviter
        </Button>
      </form>
      {grants.isLoading ? (
        <Skeleton className="h-12" />
      ) : grants.data?.length ? (
        <ul className="flex flex-col gap-2">
          {grants.data.map((g) => (
            <li key={g.id} className="flex items-center gap-3 rounded-md border border-line bg-page/70 p-2 pl-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface font-serif">
                {g.grantee.displayName[0]?.toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{g.grantee.displayName}</p>
                <p className="text-xs text-muted">@{g.grantee.username}</p>
              </div>
              <IconButton icon="x" label={`Retirer l’accès de ${g.grantee.displayName}`} onClick={() => remove.mutate(g.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Personne n’a été invité pour l’instant.</p>
      )}
    </Card>
  );
}
