import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FriendDto } from '@laito/shared';
import { errorMessage } from '@/api/client';
import { friendsApi, qk } from '@/api/endpoints';
import { Button, IconButton, Section, Skeleton, TextField } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { Avatar } from '@/components/Avatar';

export function FriendsSection() {
  const qc = useQueryClient();
  const toast = useToast();
  const friends = useQuery({ queryKey: qk.friends, queryFn: friendsApi.list });
  const [username, setUsername] = useState('');
  const add = useMutation({
    mutationFn: (u: string) => friendsApi.add(u),
    onSuccess: (f) => {
      setUsername('');
      void qc.invalidateQueries({ queryKey: qk.friends });
      toast.success(
        f.status === 'accepted'
          ? `Vous êtes maintenant amis avec ${f.displayName}.`
          : 'Demande envoyée.',
      );
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => friendsApi.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.friends }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const label = (f: FriendDto) =>
    f.status === 'accepted'
      ? 'Ami'
      : f.direction === 'incoming'
        ? 'Demande reçue'
        : 'Demande envoyée';

  return (
    <Section
      id="p-friends"
      title="Amis"
      description="Vos amis lisent les livres et chapitres en visibilité « Amis »."
    >
      <form
        className="mb-4 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (username.trim()) add.mutate(username.trim().replace(/^@/, ''));
        }}
      >
        <TextField
          label="Ajouter par pseudo"
          placeholder="@pseudo"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="flex-1"
        />
        <Button
          type="submit"
          variant="secondary"
          icon="plus"
          busy={add.isPending}
          disabled={!username.trim()}
        >
          Ajouter
        </Button>
      </form>
      {friends.isLoading ? (
        <Skeleton className="h-12" />
      ) : friends.data?.length ? (
        <ul className="flex flex-col gap-2">
          {friends.data.map((f) => (
            <li
              key={f.userId}
              className="flex items-center gap-3 rounded-md border border-line bg-page/70 p-2 pl-3"
            >
              <Avatar profile={f} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.displayName}</p>
                <p className="text-xs text-muted">
                  @{f.username} · {label(f)}
                </p>
              </div>
              {f.status === 'pending' && f.direction === 'incoming' && (
                <Button size="sm" onClick={() => add.mutate(f.username)}>
                  Accepter
                </Button>
              )}
              <IconButton
                icon="x"
                label={`Retirer ${f.displayName}`}
                onClick={() => remove.mutate(f.userId)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Pas encore d’amis sur Laito.</p>
      )}
    </Section>
  );
}
