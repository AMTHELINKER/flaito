import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FriendDto, PublicProfileDto } from '@laito/shared';
import { errorMessage } from '@/api/client';
import { friendsApi, messagingApi, qk, usersApi } from '@/api/endpoints';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Button, IconButton, Skeleton } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';

/** Ajout d'amis, demandes en attente et liste d'amis — depuis l'écran Messages. */
export function FriendsPanel() {
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const friends = useQuery({ queryKey: qk.friends, queryFn: friendsApi.list });
  const [toRemove, setToRemove] = useState<FriendDto | null>(null);

  const refresh = () => void qc.invalidateQueries({ queryKey: qk.friends });
  const add = useMutation({
    mutationFn: (username: string) => friendsApi.add(username),
    onSuccess: (f) => {
      refresh();
      toast.success(
        f.status === 'accepted'
          ? `Vous êtes maintenant amis avec ${f.displayName}.`
          : 'Demande envoyée.',
      );
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (userId: string) => friendsApi.remove(userId),
    onSuccess: refresh,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const write = useMutation({
    mutationFn: (userId: string) => messagingApi.openDirect(userId),
    onSuccess: (c) => {
      void qc.invalidateQueries({ queryKey: qk.conversations });
      navigate(`/messages/${c.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const all = friends.data ?? [];
  const incoming = all.filter((f) => f.status === 'pending' && f.direction === 'incoming');
  const outgoing = all.filter((f) => f.status === 'pending' && f.direction === 'outgoing');
  const accepted = all.filter((f) => f.status === 'accepted');
  const known = new Set(all.map((f) => f.userId));

  return (
    <div className="flex flex-col gap-5">
      <AddFriend known={known} onAdd={(u) => add.mutate(u)} busy={add.isPending} />

      {friends.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : (
        <>
          {!!incoming.length && (
            <FriendGroup title={`Demandes reçues · ${incoming.length}`}>
              {incoming.map((f) => (
                <FriendRow key={f.userId} friend={f}>
                  <Button size="sm" onClick={() => add.mutate(f.username)}>
                    Accepter
                  </Button>
                  <IconButton
                    icon="x"
                    label={`Refuser la demande de ${f.displayName}`}
                    onClick={() => remove.mutate(f.userId)}
                  />
                </FriendRow>
              ))}
            </FriendGroup>
          )}

          <FriendGroup title={accepted.length ? `Amis · ${accepted.length}` : 'Amis'}>
            {accepted.length ? (
              accepted.map((f) => (
                <FriendRow key={f.userId} friend={f}>
                  <IconButton
                    icon="message"
                    label={`Écrire à ${f.displayName}`}
                    onClick={() => write.mutate(f.userId)}
                    disabled={write.isPending}
                  />
                  <IconButton
                    icon="x"
                    label={`Retirer ${f.displayName} de vos amis`}
                    onClick={() => setToRemove(f)}
                  />
                </FriendRow>
              ))
            ) : (
              <p className="px-1 py-2 text-sm text-muted">
                Cherchez un pseudo ci-dessus pour ajouter vos premiers amis. Ils pourront lire vos
                livres en visibilité « Amis » et discuter avec vous.
              </p>
            )}
          </FriendGroup>

          {!!outgoing.length && (
            <FriendGroup title="Demandes envoyées">
              {outgoing.map((f) => (
                <FriendRow key={f.userId} friend={f} muted>
                  <Button variant="ghost" size="sm" onClick={() => remove.mutate(f.userId)}>
                    Annuler
                  </Button>
                </FriendRow>
              ))}
            </FriendGroup>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!toRemove}
        title={`Retirer ${toRemove?.displayName ?? ''} de vos amis ?`}
        message="Vous ne verrez plus ses livres réservés aux amis, et votre conversation privée passera en lecture seule."
        confirmLabel="Retirer"
        danger
        onConfirm={() => {
          if (toRemove) remove.mutate(toRemove.userId);
          setToRemove(null);
        }}
        onCancel={() => setToRemove(null)}
      />
    </div>
  );
}

function AddFriend({
  known,
  onAdd,
  busy,
}: {
  known: Set<string>;
  onAdd: (username: string) => void;
  busy: boolean;
}) {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(term.trim().replace(/^@/, '')), 250);
    return () => window.clearTimeout(t);
  }, [term]);
  const results = useQuery({
    queryKey: qk.userSearch(debounced),
    queryFn: () => usersApi.search(debounced),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });
  const people = (results.data ?? []).filter((p) => !known.has(p.userId));

  return (
    <section>
      <label htmlFor="add-friend-input" className="mb-1.5 block text-sm font-medium">
        Ajouter un ami
      </label>
      <div className="relative">
        <Icon
          name="search"
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          id="add-friend-input"
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Pseudo ou nom"
          autoComplete="off"
          className="min-h-11 w-full rounded-md border border-line bg-page/80 pl-10 pr-3 text-fg placeholder:text-muted/80 focus:border-accent-text focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      {debounced.length >= 2 && (
        <ul className="mt-2 flex flex-col gap-1" aria-live="polite">
          {results.isLoading ? (
            <Skeleton className="h-12" />
          ) : people.length ? (
            people.map((p) => (
              <PersonRow key={p.userId} person={p}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon="userPlus"
                  busy={busy}
                  onClick={() => onAdd(p.username)}
                >
                  Ajouter
                </Button>
              </PersonRow>
            ))
          ) : (
            <li className="px-1 py-2 text-sm text-muted">
              Personne de nouveau ne correspond à « {debounced} ».
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

function FriendGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 px-1 font-sans text-xs font-semibold uppercase tracking-wider text-muted">
        {title}
      </h3>
      <ul className="flex flex-col gap-1">{children}</ul>
    </section>
  );
}

function PersonRow({
  person,
  children,
  muted,
}: {
  person: PublicProfileDto;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <li className="flex items-center gap-3 rounded-md px-1 py-1.5">
      <Avatar profile={person} size={36} />
      <div className={muted ? 'min-w-0 flex-1 opacity-75' : 'min-w-0 flex-1'}>
        <p className="truncate text-sm font-medium">{person.displayName}</p>
        <p className="truncate text-xs text-muted">@{person.username}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </li>
  );
}

function FriendRow({
  friend,
  children,
  muted,
}: {
  friend: FriendDto;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <PersonRow person={friend} muted={muted}>
      {children}
    </PersonRow>
  );
}
