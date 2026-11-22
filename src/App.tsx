import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { PublicOnly, RequireAuth, SplashScreen, WaitForAuth } from '@/auth/guards';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/ui/Toast';
import { syncPendingDrafts } from '@/features/editor/drafts';
import { MessagingSync } from '@/features/messaging/MessagingSync';
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from '@/features/auth/AuthPages';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { HomePage, LibraryPage, NewBookPage } from '@/features/library/LibraryPages';

const EditorPage = lazy(() =>
  import('@/features/editor/EditorPage').then((m) => ({ default: m.EditorPage })),
);
const ReaderPage = lazy(() =>
  import('@/features/reader/ReaderPage').then((m) => ({ default: m.ReaderPage })),
);
const BookSettingsPage = lazy(() =>
  import('@/features/book/BookSettingsPage').then((m) => ({ default: m.BookSettingsPage })),
);
const DiscoverPage = lazy(() =>
  import('@/features/discover/DiscoverPage').then((m) => ({ default: m.DiscoverPage })),
);
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const MyProfilePage = lazy(() =>
  import('@/features/profile/ProfilePages').then((m) => ({ default: m.MyProfilePage })),
);
const PublicProfilePage = lazy(() =>
  import('@/features/profile/ProfilePages').then((m) => ({ default: m.PublicProfilePage })),
);
const MessagesPage = lazy(() =>
  import('@/features/messaging/MessagesPage').then((m) => ({ default: m.MessagesPage })),
);
const AdminPage = lazy(() =>
  import('@/features/admin/AdminPage').then((m) => ({ default: m.AdminPage })),
);
const ShareLandingPage = lazy(() =>
  import('@/features/share/ShareLandingPage').then((m) => ({ default: m.ShareLandingPage })),
);

/** Synchronise les brouillons hors ligne au retour de la connexion. */
function DraftSync() {
  const { status } = useAuth();
  const toast = useToast();
  useEffect(() => {
    if (status !== 'authenticated') return;
    const run = () =>
      void syncPendingDrafts().then((n) => {
        if (n > 0) toast.success(n > 1 ? `${n} chapitres synchronisés` : 'Chapitre synchronisé');
      });
    run();
    window.addEventListener('online', run);
    return () => window.removeEventListener('online', run);
  }, [status, toast]);
  return null;
}

export function App() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <DraftSync />
      <MessagingSync />
      <Routes>
        <Route element={<PublicOnly />}>
          <Route path="/bienvenue" element={<OnboardingPage />} />
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/inscription" element={<RegisterPage />} />
          <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="/verifier-email" element={<VerifyEmailPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<WaitForAuth />}>
          <Route path="/s/:token" element={<ShareLandingPage />} />
          <Route path="/share/:token" element={<ShareLandingPage />} />
          <Route path="/lire/:bookId/:chapterId?" element={<ReaderPage />} />
          {/* Catalogue public : accessible sans compte. */}
          <Route element={<AppShell />}>
            <Route path="/decouvrir" element={<DiscoverPage />} />
            <Route path="/u/:username" element={<PublicProfilePage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/livres/:bookId/ecrire/:chapterId?" element={<EditorPage />} />
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="/bibliotheque" element={<LibraryPage />} />
            <Route path="/ecrire" element={<NewBookPage />} />
            <Route path="/messages/:conversationId?" element={<MessagesPage />} />
            <Route path="/profil" element={<MyProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/parametres" element={<SettingsPage />} />
            <Route path="/livres/:bookId/reglages" element={<BookSettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
