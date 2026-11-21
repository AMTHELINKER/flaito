import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ProfileDto } from '@laito/shared';
import { errorMessage } from '@/api/client';
import { meApi, qk } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { BookCard, BookGrid, BookGridSkeleton } from '@/components/BookCard';
import { Icon } from '@/components/ui/Icon';
import { Button, Card, EmptyState, ErrorNotice, Skeleton, TextArea, TextField, cx } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';

export function Avatar({ profile, size = 80 }: { profile: Pick<ProfileDto, 'displayName' | 'avatarUrl'>; size?: number }) {
  return profile.avatarUrl ? (
    <img src={profile.avatarUrl} alt="" width={size} height={size} className="rounded-full object-cover shadow-soft" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="flex items-center justify-center rounded-full bg-leather font-serif text-parchment shadow-soft"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {profile.displayName[0]?.toUpperCase() ?? '?'}
    </span>
  );
}

function ProfileHeader({ profile, actions }: { profile: ProfileDto; actions?: React.ReactNode }) {
  return (
    <Card className="mb-8 flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:items-start sm:text-left">
      <Avatar profile={profile} size={96} />
      <div className="min-w-0 flex-1">
        <h1 className="text-3xl">{profile.displayName}</h1>
        <p className="text-muted">@{profile.username}</p>
        {profile.bio && <p className="mt-3 max-w-prose whitespace-pre-line font-serif">{profile.bio}</p>}
        {!!profile.links.length && (
          <ul className="mt-3 flex flex-wrap justify-center gap-3 sm:justify-start">
            {profile.links.map((l) => (
              <li key={l}>
                <a href={l} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-sm text-accent-text underline-offset-2 hover:underline">
                  <Icon name="link" size={14} />
                  {l.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      {actions}
    </Card>
  );
}

// Profil public d'un auteur
export function PublicProfilePage() {
  const { username = '' } = useParams();
  const q = useQuery({ queryKey: qk.profile(username), queryFn: () => meApi.publicProfile(username) });
  if (q.isLoading)
    return (
      <>
        <Skeleton className="mb-8 h-40" />
        <BookGridSkeleton />
      </>
    );
  if (q.error) return <ErrorNotice error={q.error} />;
  const { profile, books } = q.data!;
  return (
    <>
      <ProfileHeader profile={profile} />
      <h2 className="mb-3 text-xl">Livres publics</h2>
      {books.length ? (
        <BookGrid>
          {books.map((b) => (
            <BookCard key={b.id} book={b} to={`/lire/${b.id}`} showMeta={false} />
          ))}
        </BookGrid>
      ) : (
        <EmptyState icon="bookOpen" title="Pas encore de livre public" />
      )}
    </>
  );
}

// Mon profil (modifiable)
export function MyProfilePage() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const publicQ = useQuery({
    queryKey: qk.profile(user!.profile.username),
    queryFn: () => meApi.publicProfile(user!.profile.username),
  });

  const avatar = useMutation({
    mutationFn: meApi.uploadAvatar,
    onSuccess: (profile) => {
      setUser((u) => ({ ...u, profile }));
      toast.success('Photo mise à jour');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!user) return null;
  return (
    <>
      <ProfileHeader
        profile={user.profile}
        actions={
          <div className="flex flex-col gap-2">
            <Button variant="secondary" size="sm" icon="edit" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
              Modifier
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Choisir une photo de profil"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) avatar.mutate(f);
                e.target.value = '';
              }}
            />
            <Button variant="ghost" size="sm" icon="image" busy={avatar.isPending} onClick={() => fileRef.current?.click()}>
              Photo
            </Button>
            <Link to="/parametres" className="pressable inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-3 text-sm hover:bg-fg/[0.06]">
              <Icon name="settings" size={16} /> Paramètres
            </Link>
          </div>
        }
      />
      {editing && <EditProfile profile={user.profile} onDone={() => setEditing(false)} />}

      <h2 className="mb-3 text-xl">Mes livres publics</h2>
      {publicQ.isLoading ? (
        <BookGridSkeleton />
      ) : publicQ.data?.books.length ? (
        <BookGrid>
          {publicQ.data.books.map((b) => (
            <BookCard key={b.id} book={b} to={`/lire/${b.id}`} showMeta={false} />
          ))}
        </BookGrid>
      ) : (
        <EmptyState
          icon="globe"
          title="Aucun livre public"
          text="Vos livres restent privés tant que vous ne choisissez pas de les partager."
          action={
            <Link to="/bibliotheque">
              <Button variant="secondary">Ma bibliothèque</Button>
            </Link>
          }
        />
      )}
      <p className="mt-10 text-center text-sm">
        <a
          href="mailto:avis@laito.app?subject=Mon%20avis%20sur%20Laito"
          className="inline-flex items-center gap-1.5 text-accent-text underline-offset-2 hover:underline"
        >
          <Icon name="mail" size={16} /> Donner mon avis
        </a>
      </p>
    </>
  );
}

function EditProfile({ profile, onDone }: { profile: ProfileDto; onDone: () => void }) {
  const { setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    displayName: profile.displayName,
    username: profile.username,
    bio: profile.bio ?? '',
    links: profile.links.join('\n'),
  });
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () =>
      meApi.updateProfile({
        displayName: form.displayName.trim(),
        username: form.username.trim(),
        bio: form.bio.trim(),
        links: form.links
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => (/^https?:\/\//.test(l) ? l : `https://${l}`))
          .slice(0, 5),
      }),
    onSuccess: (p) => {
      setUser((u) => ({ ...u, profile: p }));
      toast.success('Profil enregistré');
      onDone();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Card className="mb-8 animate-rise">
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          save.mutate();
        }}
      >
        <TextField label="Nom affiché" value={form.displayName} maxLength={60} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        <TextField label="Pseudo" value={form.username} maxLength={30} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <TextArea label="Biographie" rows={4} maxLength={1000} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="sm:col-span-2" />
        <TextArea
          label="Liens"
          hint="Un lien par ligne (5 maximum)."
          rows={3}
          value={form.links}
          onChange={(e) => setForm({ ...form, links: e.target.value })}
          className="sm:col-span-2"
        />
        {error && (
          <p role="alert" className={cx('text-sm text-danger sm:col-span-2')}>
            {error}
          </p>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" busy={save.isPending}>
            Enregistrer
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            Annuler
          </Button>
        </div>
      </form>
    </Card>
  );
}
