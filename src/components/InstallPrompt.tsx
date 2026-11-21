import { useEffect, useState } from 'react';
import { Button, IconButton } from './ui/primitives';
import { Logo } from './Logo';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'laito.installDismissedAt';

/** Invitation discrète à installer Laito sur l'écran d'accueil. */
export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      try {
        const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
        if (Date.now() - at < 1000 * 60 * 60 * 24 * 14) return;
      } catch {
        /* ignore */
      }
      setEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    const installed = () => setEvt(null);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  if (!evt) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setEvt(null);
  };
  return (
    <div className="glass fixed inset-x-3 bottom-20 z-50 flex items-center gap-3 rounded-lg p-3 animate-rise md:inset-x-auto md:bottom-6 md:right-6 md:w-96">
      <Logo withName={false} />
      <p className="flex-1 text-sm">Installez Laito pour écrire et lire, même hors ligne.</p>
      <Button
        size="sm"
        onClick={async () => {
          await evt.prompt();
          await evt.userChoice;
          setEvt(null);
        }}
      >
        Installer
      </Button>
      <IconButton icon="x" label="Plus tard" onClick={dismiss} />
    </div>
  );
}
