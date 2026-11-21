import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { Avatar } from './Avatar';
import { Icon, type IconName } from './ui/Icon';
import { Button, cx } from './ui/primitives';

/**
 * Accès au compte, en haut à droite de chaque écran : avatar qui ouvre
 * un menu court (profil, paramètres, déconnexion). Visiteur : « Se connecter ».
 */
export function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    // Focus sur le premier élément du menu à l'ouverture.
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <Link to="/connexion">
        <Button variant="secondary" size="sm">
          Se connecter
        </Button>
      </Link>
    );
  }

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  const item =
    'pressable flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm hover:bg-fg/[0.06] focus-visible:bg-fg/[0.06] focus-visible:outline-none';
  const entry = (to: string, icon: IconName, label: string) => (
    <Link role="menuitem" to={to} className={item} onClick={() => setOpen(false)}>
      <Icon name={icon} size={18} /> {label}
    </Link>
  );

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Compte de ${user.profile.displayName}`}
        onClick={() => setOpen((o) => !o)}
        className={cx(
          'pressable flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          open && 'ring-2 ring-accent/60',
        )}
      >
        <Avatar profile={user.profile} size={38} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Compte"
          onKeyDown={onMenuKey}
          className="glass-strong absolute right-0 top-full z-50 mt-2 w-60 rounded-lg p-1.5 animate-rise"
        >
          <div className="mb-1 border-b border-line px-3 pb-2 pt-1.5">
            <p className="truncate font-medium">{user.profile.displayName}</p>
            <p className="truncate text-xs text-muted">@{user.profile.username}</p>
          </div>
          {entry('/profil', 'user', 'Mon profil')}
          {entry('/parametres', 'settings', 'Paramètres')}
          <button
            role="menuitem"
            type="button"
            className={item}
            onClick={async () => {
              setOpen(false);
              await logout();
              navigate('/connexion', { replace: true });
            }}
          >
            <Icon name="logOut" size={18} /> Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
