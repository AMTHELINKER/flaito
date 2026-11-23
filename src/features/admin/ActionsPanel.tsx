import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ModerationActionDto, ModerationActionType } from '@laito/shared';
import { errorMessage } from '@/api/client';
import { adminApi, qk } from '@/api/endpoints';
import { Button, EmptyState, Skeleton } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { timeAgo } from '@/lib/format';

const ACTION_LABELS: Record<ModerationActionType, string> = {
  hide_content: 'a masqué',
  unhide_content: 'a rétabli',
  suspend_user: 'a suspendu',
  reinstate_user: 'a réactivé',
  dismiss_report: 'a classé un signalement sur',
  change_role: 'a changé le rôle de',
  delete_user: 'a supprimé le compte de',
};

/** Journal des décisions : qui, quoi, quand, pourquoi. Un masquage peut être annulé d'ici. */
export function ActionsPanel() {
  const qc = useQueryClient();
  const toast = useToast();
  const actions = useInfiniteQuery({
    queryKey: qk.adminActions,
    queryFn: ({ pageParam }) => adminApi.actions(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const unhide = useMutation({
    mutationFn: (a: ModerationActionDto) =>
      adminApi.unhide(a.targetType as 'book' | 'chapter' | 'message', a.targetId),
    onSuccess: () => {
      toast.success('Contenu rétabli.');
      void qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const items = actions.data?.pages.flatMap((p) => p.items) ?? [];

  if (actions.isLoading) return <Skeleton className="h-40" />;
  if (!items.length) return <EmptyState icon="shield" title="Aucune décision pour l’instant" />;
  return (
    <div className="flex flex-col gap-3">
      <ol className="glass divide-y divide-line rounded-lg">
        {items.map((a) => (
          <li key={a.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 p-3 text-sm">
            <span className="font-medium">{a.moderator?.displayName ?? 'Ancien modérateur'}</span>
            <span className="text-muted">{ACTION_LABELS[a.action]}</span>
            <span className="min-w-0 flex-1 truncate">
              {/* Compte supprimé : son nom n'existe plus qu'au journal (dans la note). */}
              {a.action === 'delete_user' ? a.reason : (a.targetLabel ?? a.targetType)}
            </span>
            <time className="text-xs text-muted">{timeAgo(a.createdAt)}</time>
            {a.reason && a.action !== 'delete_user' && (
              <p className="w-full text-xs text-muted">« {a.reason} »</p>
            )}
            {a.action === 'hide_content' && (
              <Button
                size="sm"
                variant="ghost"
                busy={unhide.isPending}
                onClick={() => unhide.mutate(a)}
              >
                Rétablir
              </Button>
            )}
          </li>
        ))}
      </ol>
      {actions.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            busy={actions.isFetchingNextPage}
            onClick={() => void actions.fetchNextPage()}
          >
            Voir plus
          </Button>
        </div>
      )}
    </div>
  );
}
