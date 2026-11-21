import { NavLink, Outlet, useLocation, useMatch } from 'react-router-dom';
import { Icon, type IconName } from './ui/Icon';
import { cx } from './ui/primitives';
import { Logo } from './Logo';
import { useOnline } from '@/hooks/useOnline';
import { InstallPrompt } from './InstallPrompt';
import { AccountMenu } from './AccountMenu';
import { useQuery } from '@tanstack/react-query';
import { messagingApi, qk } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Accueil', icon: 'home' },
  { to: '/bibliotheque', label: 'Bibliothèque', icon: 'library' },
  { to: '/ecrire', label: 'Écrire', icon: 'pen' },
  { to: '/decouvrir', label: 'Découvrir', icon: 'compass' },
  { to: '/messages', label: 'Messages', icon: 'message' },
];

/** Pastille des messages non lus (mise à jour en temps réel par MessagingSync). */
function useUnreadCount(enabled: boolean) {
  const q = useQuery({
    queryKey: qk.unread,
    queryFn: messagingApi.unread,
    enabled,
    staleTime: 60_000,
  });
  return enabled ? (q.data?.count ?? 0) : 0;
}

function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={cx(
        'flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[0.68rem] font-semibold leading-none text-accent-fg',
        className,
      )}
    >
      <span className="sr-only">, </span>
      {count > 99 ? '99+' : count}
      <span className="sr-only"> non lu{count > 1 ? 's' : ''}</span>
    </span>
  );
}

export function AppShell() {
  const online = useOnline();
  const { user } = useAuth();
  const unread = useUnreadCount(!!user);
  const badge = (to: string) => (to === '/messages' ? unread : 0);
  // Mobile : une discussion ouverte prend tout l'écran (sans barre du haut ni navigation).
  const immersive = !!useMatch('/messages/:conversationId');
  const location = useLocation();

  return (
    <div className="min-h-dvh md:pl-64">
      <a
        href="#contenu"
        className="sr-only z-[80] rounded-md bg-page px-3 py-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Aller au contenu
      </a>

      {/* Bureau : menu latéral en verre */}
      <aside className="glass fixed inset-y-3 left-3 z-40 hidden w-58 flex-col rounded-xl p-3 md:flex">
        <NavLink to="/" className="mb-6 px-2 pt-1" aria-label="Laito, accueil">
          <Logo />
        </NavLink>
        <nav aria-label="Navigation principale" className="flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                cx(
                  'pressable flex min-h-11 items-center gap-3 rounded-md px-3 text-[0.95rem]',
                  isActive
                    ? 'bg-page font-semibold shadow-soft'
                    : 'text-muted hover:bg-fg/[0.05] hover:text-fg',
                )
              }
            >
              <Icon name={n.icon} />
              <span className="flex-1">{n.label}</span>
              <UnreadBadge count={badge(n.to)} />
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          {!online && (
            <p className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted">
              <Icon name="cloudOff" size={16} /> Hors ligne
            </p>
          )}
        </div>
      </aside>

      {!online && !immersive && (
        <div className="glass fixed inset-x-3 top-16 z-40 flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs md:hidden">
          <Icon name="cloudOff" size={14} /> Hors ligne – vos écrits sont gardés sur l’appareil
        </div>
      )}

      {/* Barre du haut : logo sur mobile, compte toujours en haut à droite. */}
      <header
        className={cx(
          'mx-auto max-w-6xl items-center justify-between px-4 pt-3 sm:px-6 md:flex md:justify-end md:pt-4',
          immersive ? 'hidden' : 'flex',
        )}
      >
        <NavLink to="/" className="md:hidden" aria-label="Laito, accueil">
          <Logo />
        </NavLink>
        <AccountMenu />
      </header>

      <main
        id="contenu"
        key={location.pathname}
        className="mx-auto max-w-6xl px-4 pb-28 pt-2 animate-fade-in sm:px-6 md:pb-12 md:pt-2"
      >
        <Outlet />
      </main>

      {/* Mobile : barre de navigation en bas */}
      <nav
        aria-label="Navigation principale"
        className={cx(
          'glass safe-bottom fixed inset-x-2 bottom-2 z-40 justify-around rounded-xl md:hidden',
          immersive ? 'hidden' : 'flex',
        )}
      >
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              cx(
                'pressable flex min-h-14 min-w-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.7rem]',
                isActive ? 'font-semibold text-fg' : 'text-muted',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cx(
                    'rounded-full px-3 py-0.5 transition-colors',
                    isActive && 'bg-accent/25',
                  )}
                >
                  <span className="relative block">
                    <Icon name={n.icon} size={22} />
                    <UnreadBadge count={badge(n.to)} className="absolute -right-3 -top-2" />
                  </span>
                </span>
                {n.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      {!immersive && <InstallPrompt />}
    </div>
  );
}
