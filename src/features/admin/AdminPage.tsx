import { Navigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi, qk } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { PageHeader, Skeleton, Tabs } from '@/components/ui/primitives';
import { formatWords } from '@/lib/format';
import { ActionsPanel } from './ActionsPanel';
import { ReportsPanel } from './ReportsPanel';
import { UsersPanel } from './UsersPanel';

type Tab = 'signalements' | 'comptes' | 'journal';
export const canModerate = (role?: string) => role === 'moderator' || role === 'admin';

/**
 * Administration et modération. L'essentiel d'abord : quatre chiffres clés,
 * puis la file des signalements à traiter ; comptes et journal dans leurs onglets.
 */
export function AdminPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('onglet') as Tab) || 'signalements';
  const setTab = (t: Tab) =>
    setParams(t === 'signalements' ? {} : { onglet: t }, { replace: true });
  const stats = useQuery({
    queryKey: qk.adminStats,
    queryFn: adminApi.stats,
    enabled: canModerate(user?.role),
  });

  if (!user) return null;
  // L'API refuse aussi (403) : ceci évite seulement d'afficher un écran inutile.
  if (!canModerate(user.role)) return <Navigate to="/" replace />;

  const s = stats.data;
  const open = s?.reports.open ?? 0;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Administration"
        subtitle={user.role === 'admin' ? 'Vous êtes administrateur.' : 'Vous êtes modérateur.'}
      />

      <section aria-label="Chiffres clés" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {s ? (
          <>
            <Stat
              label="Signalements à traiter"
              value={open}
              hint={`${s.reports.resolved7d} traités en 7 j`}
              alert={open > 0}
            />
            <Stat
              label="Comptes"
              value={s.users.total}
              hint={`+${s.users.new7d} en 7 j · ${s.users.suspended} suspendu${s.users.suspended > 1 ? 's' : ''}`}
            />
            <Stat
              label="Livres"
              value={s.books.total}
              hint={`${s.books.public} publics · ${formatWords(s.words)}`}
            />
            <Stat
              label="Messages (7 j)"
              value={s.messages.last7d}
              hint={`${s.messages.total} au total`}
            />
          </>
        ) : (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)
        )}
      </section>

      <Tabs
        label="Administration"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'signalements', label: open ? `Signalements · ${open}` : 'Signalements' },
          { value: 'comptes', label: 'Comptes' },
          { value: 'journal', label: 'Journal' },
        ]}
      />
      <div role="tabpanel" aria-label={tab} className="animate-fade-in">
        {tab === 'signalements' && <ReportsPanel />}
        {tab === 'comptes' && <UsersPanel />}
        {tab === 'journal' && <ActionsPanel />}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  alert,
}: {
  label: string;
  value: number;
  hint: string;
  alert?: boolean;
}) {
  return (
    <div
      className={
        alert
          ? 'glass rounded-lg border-accent-text p-3 ring-1 ring-accent'
          : 'glass rounded-lg p-3'
      }
    >
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="font-serif text-3xl tabular-nums">{value.toLocaleString('fr-FR')}</p>
      <p className="truncate text-xs text-muted" title={hint}>
        {hint}
      </p>
    </div>
  );
}
