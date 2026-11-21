import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { readLocal } from '@/lib/storage';
import { ONBOARDED_KEY } from '@/features/onboarding/OnboardingPage';
import { Logo } from '@/components/Logo';

export function SplashScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy="true" aria-label="Chargement de Laito">
      <div className="animate-pulse">
        <Logo />
      </div>
    </div>
  );
}

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <SplashScreen />;
  if (status === 'anonymous') {
    if (location.pathname === '/' && !readLocal(ONBOARDED_KEY, false)) return <Navigate to="/bienvenue" replace />;
    const next = location.pathname + location.search;
    return <Navigate to={next === '/' ? '/connexion' : `/connexion?next=${encodeURIComponent(next)}`} replace />;
  }
  return <Outlet />;
}

export function PublicOnly() {
  const { status } = useAuth();
  if (status === 'loading') return <SplashScreen />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Attend la fin de l'amorçage de la session (lecteur accessible aux visiteurs). */
export function WaitForAuth() {
  const { status } = useAuth();
  if (status === 'loading') return <SplashScreen />;
  return <Outlet />;
}
