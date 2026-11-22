import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  REPORT_REASON_LABELS,
  type ReportDecision,
  type ReportDto,
  type ReportStatus,
} from '@laito/shared';
import { errorMessage } from '@/api/client';
import { adminApi, qk } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { Icon } from '@/components/ui/Icon';
import { Button, cx, EmptyState, Skeleton } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { timeAgo } from '@/lib/format';
import { DecisionDialog } from './DecisionDialog';

const TYPE_LABELS = {
  book: 'Livre',
  chapter: 'Chapitre',
  user: 'Profil',
  message: 'Message',
} as const;

const DECISIONS: Record<
  ReportDecision,
  { title: string; message: string; label: string; danger?: boolean }
> = {
  dismiss: {
    title: 'Classer sans suite ?',
    message:
      'Le contenu reste en ligne. Tous les signalements ouverts sur cette cible seront clos.',
    label: 'Classer sans suite',
  },
  hide: {
    title: 'Masquer ce contenu ?',
    message:
      'Il ne sera plus visible que de son auteur, et retiré du catalogue. Vous pourrez le rétablir.',
    label: 'Masquer',
  },
  suspend: {
    title: 'Suspendre l’auteur ?',
    message:
      'Le compte ne pourra plus se connecter et ses sessions seront fermées. Le contenu signalé sera aussi masqué. Vous pourrez réactiver le compte.',
    label: 'Suspendre',
    danger: true,
  },
};

export function ReportsPanel() {
  const [status, setStatus] = useState<ReportStatus>('open');
  const reports = useInfiniteQuery({
    queryKey: qk.adminReports(status),
    queryFn: ({ pageParam }) => adminApi.reports(status, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const items = reports.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 text-sm" role="group" aria-label="Filtrer les signalements">
        {(
          [
            ['open', 'À traiter'],
            ['resolved', 'Traités'],
            ['dismissed', 'Classés'],
          ] as [ReportStatus, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            aria-pressed={status === v}
            onClick={() => setStatus(v)}
            className={cx(
              'pressable min-h-10 rounded-full px-3',
              status === v ? 'bg-fg text-page' : 'text-muted hover:bg-fg/[0.06]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {reports.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : items.length ? (
        <ul className="flex flex-col gap-3">
          {items.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon="shield"
          title={status === 'open' ? 'Aucun signalement à traiter' : 'Rien ici pour l’instant'}
          text={
            status === 'open'
              ? 'La communauté est calme. Les nouveaux signalements apparaîtront ici.'
              : undefined
          }
        />
      )}
      {reports.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            busy={reports.isFetchingNextPage}
            onClick={() => void reports.fetchNextPage()}
          >
            Voir plus
          </Button>
        </div>
      )}
    </div>
  );
}

function ReportCard({ report: r }: { report: ReportDto }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [pending, setPending] = useState<ReportDecision | null>(null);
  const resolve = useMutation({
    mutationFn: ({ decision, note }: { decision: ReportDecision; note: string }) =>
      adminApi.resolve(r.id, decision, note || undefined),
    onSuccess: (_d, { decision }) => {
      setPending(null);
      toast.success(
        decision === 'dismiss'
          ? 'Classé sans suite.'
          : decision === 'hide'
            ? 'Contenu masqué.'
            : 'Compte suspendu.',
      );
      void qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const open = r.status === 'open';
  const isContent = r.targetType !== 'user';

  return (
    <li className="glass rounded-lg p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-surface px-2 py-0.5 font-medium">
          {TYPE_LABELS[r.targetType]}
        </span>
        <span className="rounded-full border border-danger/40 px-2 py-0.5 font-medium text-danger">
          {REPORT_REASON_LABELS[r.reason]}
        </span>
        {r.similarOpen > 1 && (
          <span className="rounded-full bg-accent/25 px-2 py-0.5 font-semibold">
            {r.similarOpen} signalements
          </span>
        )}
        {r.target.hidden && (
          <span className="inline-flex items-center gap-1 text-muted">
            <Icon name="eyeOff" size={12} /> {r.targetType === 'user' ? 'Suspendu' : 'Déjà masqué'}
          </span>
        )}
        <span className="ml-auto text-muted">{timeAgo(r.createdAt)}</span>
      </div>

      <h3 className="font-sans text-base font-semibold">
        {r.target.href && !r.target.missing ? (
          <Link to={r.target.href} className="underline-offset-2 hover:underline">
            {r.target.label}
          </Link>
        ) : (
          r.target.label
        )}
      </h3>
      {r.target.ownerName && <p className="text-sm text-muted">par {r.target.ownerName}</p>}
      {r.target.excerpt && (
        <blockquote className="mt-2 border-l-2 border-line pl-3 font-serif text-sm italic">
          {r.target.excerpt}
        </blockquote>
      )}
      {r.details && (
        <p className="mt-2 text-sm">
          <span className="text-muted">Précision du signalement : </span>
          {r.details}
        </p>
      )}
      <p className="mt-1 text-xs text-muted">
        Signalé par{' '}
        {r.reporter ? `${r.reporter.displayName} (@${r.reporter.username})` : 'un compte supprimé'}
      </p>

      {open && !r.target.missing && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
          {isContent && !r.target.hidden && (
            <Button size="sm" icon="eyeOff" onClick={() => setPending('hide')}>
              Masquer
            </Button>
          )}
          {r.target.ownerId && r.target.ownerId !== user?.id && (
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              onClick={() => setPending('suspend')}
            >
              Suspendre l’auteur
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setPending('dismiss')}>
            Classer sans suite
          </Button>
        </div>
      )}
      {open && r.target.missing && (
        <div className="mt-3 border-t border-line pt-3">
          <Button size="sm" variant="ghost" onClick={() => setPending('dismiss')}>
            Classer (contenu supprimé)
          </Button>
        </div>
      )}

      {pending && (
        <DecisionDialog
          open
          title={DECISIONS[pending].title}
          message={DECISIONS[pending].message}
          confirmLabel={DECISIONS[pending].label}
          danger={DECISIONS[pending].danger}
          busy={resolve.isPending}
          onConfirm={(note) => resolve.mutate({ decision: pending, note })}
          onCancel={() => setPending(null)}
        />
      )}
    </li>
  );
}
