import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AdminUserDto, UserRole } from '@laito/shared';
import { errorMessage } from '@/api/client';
import { adminApi, qk } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/ui/Icon';
import {
  Button,
  cx,
  EmptyState,
  IconButton,
  Skeleton,
  TextArea,
  TextField,
} from '@/components/ui/primitives';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/format';
import { DecisionDialog } from './DecisionDialog';

const ROLE_LABELS: Record<UserRole, string> = {
  user: 'Membre',
  moderator: 'Modérateur',
  admin: 'Administrateur',
};
const RANK: Record<UserRole, number> = { user: 0, moderator: 1, admin: 2 };

export function UsersPanel() {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(term.trim()), 300);
    return () => window.clearTimeout(t);
  }, [term]);
  const users = useInfiniteQuery({
    queryKey: qk.adminUsers(debounced),
    queryFn: ({ pageParam }) => adminApi.users(debounced, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const items = users.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Icon
          name="search"
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          aria-label="Rechercher un compte"
          placeholder="E-mail, pseudo ou nom"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="min-h-11 w-full rounded-md border border-line bg-page/80 pl-10 pr-3 focus:border-accent-text focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      {users.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((u) => (
            <UserRow key={u.userId} account={u} />
          ))}
        </ul>
      ) : (
        <EmptyState icon="users" title="Aucun compte trouvé" />
      )}
      {users.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            busy={users.isFetchingNextPage}
            onClick={() => void users.fetchNextPage()}
          >
            Voir plus
          </Button>
        </div>
      )}
    </div>
  );
}

function UserRow({ account: u }: { account: AdminUserDto }) {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [confirm, setConfirm] = useState<'suspend' | 'reinstate' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['admin'] });

  const status = useMutation({
    mutationFn: ({ action, note }: { action: 'suspend' | 'reinstate'; note: string }) =>
      action === 'suspend'
        ? adminApi.suspend(u.userId, note || undefined)
        : adminApi.reinstate(u.userId, note || undefined),
    onSuccess: (_d, { action }) => {
      setConfirm(null);
      refresh();
      toast.success(action === 'suspend' ? 'Compte suspendu.' : 'Compte réactivé.');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const role = useMutation({
    mutationFn: (r: UserRole) => adminApi.setRole(u.userId, r),
    onSuccess: () => {
      refresh();
      toast.success('Rôle modifié. Il s’applique à la prochaine connexion de la personne.');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const self = me?.id === u.userId;
  // Mêmes règles que l'API : jamais sur soi, ni sur un rang égal ou supérieur.
  const canAct = !!me && !self && RANK[u.role] < RANK[me.role];
  const suspended = u.status === 'suspended';

  return (
    <li
      className={cx(
        'glass flex flex-wrap items-center gap-3 rounded-lg p-3',
        suspended && 'opacity-80',
      )}
    >
      <Avatar profile={u} size={40} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 truncate font-medium">
          <Link to={`/u/${u.username}`} className="underline-offset-2 hover:underline">
            {u.displayName}
          </Link>
          {u.role !== 'user' && (
            <span className="rounded-full bg-accent/25 px-2 py-0.5 text-xs font-semibold">
              {ROLE_LABELS[u.role]}
            </span>
          )}
          {suspended && (
            <span className="rounded-full border border-danger/40 px-2 py-0.5 text-xs font-medium text-danger">
              Suspendu
            </span>
          )}
          {self && <span className="text-xs text-muted">(vous)</span>}
        </p>
        <p className="truncate text-xs text-muted">
          @{u.username} · {u.email}
          {!u.emailVerified && ' · e-mail non vérifié'}
        </p>
        <p className="text-xs text-muted">
          Inscrit le {formatDate(u.createdAt)} · {u.bookCount} livre{u.bookCount > 1 ? 's' : ''}
        </p>
      </div>
      {canAct && (
        <div className="flex items-center gap-2">
          {me?.role === 'admin' && (
            <select
              aria-label={`Rôle de ${u.displayName}`}
              value={u.role}
              disabled={role.isPending}
              onChange={(e) => role.mutate(e.target.value as UserRole)}
              className="min-h-10 rounded-md border border-line bg-page/80 px-2 text-sm"
            >
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          )}
          {suspended ? (
            <Button size="sm" variant="secondary" onClick={() => setConfirm('reinstate')}>
              Réactiver
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              onClick={() => setConfirm('suspend')}
            >
              Suspendre
            </Button>
          )}
          {me?.role === 'admin' && (
            <IconButton
              icon="trash"
              label={`Supprimer le compte de ${u.displayName}`}
              className="text-danger"
              onClick={() => setDeleting(true)}
            />
          )}
        </div>
      )}
      {deleting && <DeleteAccountDialog account={u} onClose={() => setDeleting(false)} />}
      {confirm && (
        <DecisionDialog
          open
          title={
            confirm === 'suspend' ? `Suspendre ${u.displayName} ?` : `Réactiver ${u.displayName} ?`
          }
          message={
            confirm === 'suspend'
              ? 'La personne ne pourra plus se connecter et ses sessions seront fermées. Ses contenus restent en ligne, sauf s’ils sont masqués.'
              : 'La personne pourra de nouveau se connecter.'
          }
          confirmLabel={confirm === 'suspend' ? 'Suspendre' : 'Réactiver'}
          danger={confirm === 'suspend'}
          busy={status.isPending}
          onConfirm={(note) => status.mutate({ action: confirm, note })}
          onCancel={() => setConfirm(null)}
        />
      )}
    </li>
  );
}

/** Suppression définitive : on retape le pseudo pour confirmer (action irréversible). */
function DeleteAccountDialog({
  account: u,
  onClose,
}: {
  account: AdminUserDto;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [typed, setTyped] = useState('');
  const [note, setNote] = useState('');
  const del = useMutation({
    mutationFn: () => adminApi.deleteUser(u.userId, note.trim() || undefined),
    onSuccess: () => {
      toast.success(`Compte de ${u.displayName} supprimé.`);
      void qc.invalidateQueries({ queryKey: ['admin'] });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const ok = typed.trim().replace(/^@/, '').toLowerCase() === u.username.toLowerCase();
  return (
    <Modal
      open
      onClose={onClose}
      title={`Supprimer le compte de ${u.displayName} ?`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="danger" busy={del.isPending} disabled={!ok} onClick={() => del.mutate()}>
            Supprimer définitivement
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-muted">
          Le compte <strong className="text-fg">{u.email}</strong> et toutes ses données (livres,
          chapitres, messages, amis, lectures) seront effacés.{' '}
          <strong className="text-fg">Cette action est irréversible.</strong> L’adresse e-mail et le
          pseudo redeviendront disponibles.
        </p>
        <TextField
          label={`Pour confirmer, tapez le pseudo « ${u.username} »`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoFocus
        />
        <TextArea
          label="Note pour le journal (facultatif)"
          rows={2}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Modal>
  );
}
