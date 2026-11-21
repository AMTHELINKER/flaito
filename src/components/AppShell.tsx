import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon, type IconName } from './ui/Icon';
import { cx } from './ui/primitives';
import { Logo } from './Logo';
import { useAuth } from '@/auth/AuthProvider';
import { useOnline } from '@/hooks/useOnline';
import { InstallPrompt } from './InstallPrompt';

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Accueil', icon: 'home' },
  { to: '/bibliotheque', label: 'Bibliothèque', icon: 'library' },
  { to: '/ecrire', label: 'Écrire', icon: 'pen' },
  { to: '/decouvrir', label: 'Découvrir', icon: 'compass' },
  { to: '/profil', label: 'Profil', icon: 'user' },
];

export function AppShell() {
  const { user } = useAuth();
  const online = useOnline();
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
                  isActive ? 'bg-page font-semibold shadow-soft' : 'text-muted hover:bg-fg/[0.05] hover:text-fg',
                )
              }
            >
              <Icon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          {!online && (
            <p className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted">
              <Icon name="cloudOff" size={16} /> Hors ligne
            </p>
          )}
          <NavLink
            to="/parametres"
            className={({ isActive }) =>
              cx(
                'pressable flex min-h-11 items-center gap-3 rounded-md px-3 text-sm',
                isActive ? 'bg-page font-semibold' : 'text-muted hover:text-fg',
              )
            }
          >
            <Icon name="settings" size={18} />
            Paramètres
          </NavLink>
          {user && (
            <p className="truncate px-3 pb-1 text-xs text-muted" title={user.email}>
              {user.profile.displayName}
            </p>
          )}
        </div>
      </aside>

      {!online && (
        <div className="glass fixed inset-x-3 top-3 z-40 flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs md:hidden">
          <Icon name="cloudOff" size={14} /> Hors ligne – vos écrits sont gardés sur l’appareil
        </div>
      )}

      <main id="contenu" key={location.pathname} className="mx-auto max-w-6xl px-4 pb-28 pt-6 animate-fade-in sm:px-6 md:pb-12 md:pt-10">
        <Outlet />
      </main>

      {/* Mobile : barre de navigation en bas */}
      <nav
        aria-label="Navigation principale"
        className="glass safe-bottom fixed inset-x-2 bottom-2 z-40 flex justify-around rounded-xl md:hidden"
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
                <span className={cx('rounded-full px-3 py-0.5 transition-colors', isActive && 'bg-accent/25')}>
                  <Icon name={n.icon} size={22} />
                </span>
                {n.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <InstallPrompt />
    </div>
  );
}
