import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GROUP_MAX_MEMBERS, GROUP_TITLE_MAX_LENGTH, type ConversationDto } from '@laito/shared';
import { errorMessage } from '@/api/client';
import { friendsApi, messagingApi, qk } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { Avatar } from '@/components/Avatar';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { Button, Disclosure, IconButton, TextField } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { removeConversation } from './cache';
import { MemberPicker } from './MemberPicker';

const ROLE_LABELS = { owner: 'Propriétaire', admin: 'Administrateur', member: '' } as const;

export function GroupInfoModal({
  conversation,
  open,
  onClose,
}: {
  conversation: ConversationDto;
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const meId = user!.id;
  const canManage = conversation.myRole === 'owner' || conversation.myRole === 'admin';
  const [title, setTitle] = useState(conversation.title ?? '');
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [confirmLeave, setConfirmLeave] = useState(false);

  const friends = useQuery({
    queryKey: qk.friends,
    queryFn: friendsApi.list,
    enabled: open && canManage,
  });
  const inGroup = new Set(conversation.members.map((m) => m.userId));
  const candidates = (friends.data ?? []).filter(
    (f) => f.status === 'accepted' && !inGroup.has(f.userId),
  );

  const setConversation = (c: ConversationDto) => {
    qc.setQueryData(qk.conversation(c.id), c);
    void qc.invalidateQueries({ queryKey: qk.conversations, exact: true });
  };
  const onError = (e: unknown) => toast.error(errorMessage(e));

  const rename = useMutation({
    mutationFn: () => messagingApi.rename(conversation.id, title.trim()),
    onSuccess: (c) => {
      setConversation(c);
      toast.success('Groupe renommé');
    },
    onError,
  });
  const add = useMutation({
    mutationFn: () => messagingApi.addMembers(conversation.id, [...adding]),
    onSuccess: (c) => {
      setConversation(c);
      setAdding(new Set());
      toast.success('Membres ajoutés');
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: (userId: string) => messagingApi.removeMember(conversation.id, userId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.conversation(conversation.id) }),
    onError,
  });
  const leave = useMutation({
    mutationFn: () => messagingApi.removeMember(conversation.id, meId),
    onSuccess: () => {
      removeConversation(qc, conversation.id);
      onClose();
      navigate('/messages', { replace: true });
      toast.show('Vous avez quitté le groupe.');
    },
    onError,
  });

  const room = GROUP_MAX_MEMBERS - conversation.members.length;

  return (
    <Modal open={open} onClose={onClose} title={conversation.title ?? 'Groupe'}>
      <div className="flex flex-col gap-5">
        {canManage && (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim() && title.trim() !== conversation.title) rename.mutate();
            }}
          >
            <TextField
              label="Nom du groupe"
              value={title}
              maxLength={GROUP_TITLE_MAX_LENGTH}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              variant="secondary"
              busy={rename.isPending}
              disabled={!title.trim() || title.trim() === conversation.title}
            >
              Renommer
            </Button>
          </form>
        )}

        <section>
          <h3 className="mb-1.5 font-sans text-xs font-semibold uppercase tracking-wider text-muted">
            {conversation.members.length} membre{conversation.members.length > 1 ? 's' : ''}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {conversation.members.map((m) => (
              <li key={m.userId} className="flex items-center gap-3 rounded-md px-1 py-1.5">
                <Avatar profile={m} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.displayName}
                    {m.userId === meId && <span className="text-muted"> (vous)</span>}
                  </p>
                  <p className="truncate text-xs text-muted">
                    @{m.username}
                    {ROLE_LABELS[m.role] && ` · ${ROLE_LABELS[m.role]}`}
                  </p>
                </div>
                {canManage && m.userId !== meId && m.role !== 'owner' && (
                  <IconButton
                    icon="x"
                    label={`Retirer ${m.displayName} du groupe`}
                    onClick={() => remove.mutate(m.userId)}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>

        {canManage && room > 0 && (
          <Disclosure summary="Ajouter des amis">
            <MemberPicker
              people={candidates}
              selected={adding}
              onToggle={(id) =>
                setAdding((s) => {
                  const n = new Set(s);
                  if (n.has(id)) n.delete(id);
                  else if (n.size < room) n.add(id);
                  return n;
                })
              }
              emptyText="Tous vos amis font déjà partie du groupe."
            />
            {!!adding.size && (
              <div>
                <Button busy={add.isPending} onClick={() => add.mutate()}>
                  Ajouter {adding.size} ami{adding.size > 1 ? 's' : ''}
                </Button>
              </div>
            )}
          </Disclosure>
        )}

        <div className="border-t border-line pt-4">
          <Button
            variant="ghost"
            icon="logOut"
            className="text-danger"
            onClick={() => setConfirmLeave(true)}
          >
            Quitter le groupe
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        title="Quitter le groupe ?"
        message={
          conversation.myRole === 'owner' && conversation.members.length > 1
            ? 'Vous ne verrez plus ses messages. Le membre le plus ancien deviendra propriétaire.'
            : 'Vous ne verrez plus ses messages.'
        }
        confirmLabel="Quitter"
        danger
        onConfirm={() => {
          setConfirmLeave(false);
          leave.mutate();
        }}
        onCancel={() => setConfirmLeave(false)}
      />
    </Modal>
  );
}
