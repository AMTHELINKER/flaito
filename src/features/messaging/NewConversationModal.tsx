import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GROUP_TITLE_MAX_LENGTH } from '@laito/shared';
import { errorMessage } from '@/api/client';
import { friendsApi, messagingApi, qk } from '@/api/endpoints';
import { Modal } from '@/components/ui/Modal';
import { Button, Skeleton, TextField } from '@/components/ui/primitives';
import { MemberPicker } from './MemberPicker';

/**
 * Un seul parcours : choisir un ami ouvre la conversation privée,
 * en choisir plusieurs crée un groupe (le champ « nom » n'apparaît qu'alors).
 */
export function NewConversationModal({
  open,
  onClose,
  onAddFriends,
}: {
  open: boolean;
  onClose: () => void;
  onAddFriends: () => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const friends = useQuery({ queryKey: qk.friends, queryFn: friendsApi.list, enabled: open });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const accepted = (friends.data ?? []).filter((f) => f.status === 'accepted');
  const isGroup = selected.size > 1;
  const single = accepted.find((f) => selected.has(f.userId));

  const reset = () => {
    setSelected(new Set());
    setTitle('');
    setError(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const create = useMutation({
    mutationFn: () =>
      isGroup
        ? messagingApi.createGroup(title.trim(), [...selected])
        : messagingApi.openDirect([...selected][0]),
    onSuccess: (c) => {
      void qc.invalidateQueries({ queryKey: qk.conversations });
      close();
      navigate(`/messages/${c.id}`);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const label = isGroup
    ? `Créer le groupe (${selected.size + 1})`
    : single
      ? `Écrire à ${single.displayName}`
      : 'Choisissez un ami';

  return (
    <Modal
      open={open}
      onClose={close}
      title="Nouvelle conversation"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Annuler
          </Button>
          <Button
            busy={create.isPending}
            disabled={!selected.size || (isGroup && !title.trim())}
            onClick={() => create.mutate()}
          >
            {label}
          </Button>
        </>
      }
    >
      {friends.isLoading ? (
        <Skeleton className="h-40" />
      ) : accepted.length ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">Un ami : conversation privée. Plusieurs : un groupe.</p>
          <MemberPicker people={accepted} selected={selected} onToggle={toggle} emptyText="" />
          {isGroup && (
            <TextField
              label="Nom du groupe"
              value={title}
              maxLength={GROUP_TITLE_MAX_LENGTH}
              placeholder="Atelier d’écriture du jeudi"
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="text-muted">Vous discutez avec vos amis. Commencez par en ajouter un.</p>
          <Button
            variant="secondary"
            icon="userPlus"
            onClick={() => {
              close();
              onAddFriends();
            }}
          >
            Ajouter des amis
          </Button>
        </div>
      )}
    </Modal>
  );
}
