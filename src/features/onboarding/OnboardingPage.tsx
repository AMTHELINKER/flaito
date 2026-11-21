import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Button, cx } from '@/components/ui/primitives';
import { writeLocal } from '@/lib/storage';

const STEPS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'feather',
    title: 'Écrire, sans distraction',
    text: 'Une page calme, vos chapitres à portée de main, et une sauvegarde qui veille sur chaque mot.',
  },
  {
    icon: 'lock',
    title: 'Garder privé, ou partager',
    text: 'Chaque livre et chaque chapitre a sa visibilité : privé, amis, lien privé ou public. Vous changez d’avis quand vous voulez.',
  },
  {
    icon: 'bookOpen',
    title: 'Lire confortablement',
    text: 'Parchemin, sépia ou nuit chaude : un lecteur pensé comme un vrai livre, qui reprend là où vous vous êtes arrêté.',
  },
];

export const ONBOARDED_KEY = 'laito.onboarded';

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const finish = () => {
    writeLocal(ONBOARDED_KEY, true);
    navigate('/inscription');
  };
  const s = STEPS[step];
  return (
    <div className="flex min-h-dvh flex-col px-4 py-6">
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        <Logo />
        <button
          type="button"
          onClick={finish}
          className="pressable min-h-11 rounded-md px-3 text-sm text-muted hover:text-fg"
        >
          Passer
        </button>
      </div>
      <div
        className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center"
        aria-live="polite"
      >
        <div key={step} className="flex flex-col items-center gap-5 animate-rise">
          <div className="glass flex h-24 w-24 items-center justify-center rounded-full text-accent-text">
            <Icon name={s.icon} size={44} strokeWidth={1.3} />
          </div>
          <h1 className="text-3xl">{s.title}</h1>
          <p className="text-lg text-muted">{s.text}</p>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <div
          className="flex justify-center gap-2"
          aria-label={`Étape ${step + 1} sur ${STEPS.length}`}
        >
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cx(
                'h-1.5 rounded-full transition-all duration-200',
                i === step ? 'w-6 bg-accent' : 'w-1.5 bg-fg/20',
              )}
            />
          ))}
        </div>
        <Button size="lg" onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : finish())}>
          {step < STEPS.length - 1 ? 'Suivant' : 'Commencer'}
        </Button>
        <p className="text-center text-sm">
          Déjà un compte ?{' '}
          <Link
            to="/connexion"
            onClick={() => writeLocal(ONBOARDED_KEY, true)}
            className="text-accent-text underline-offset-2 hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
