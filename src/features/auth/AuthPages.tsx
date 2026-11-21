import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PASSWORD_MIN_LENGTH, type ThemeName } from '@laito/shared';
import { ApiRequestError, errorMessage } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { Logo } from '@/components/Logo';
import { Button, Card, TextField, cx } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { applyTheme, applyUiFontSize, storedTheme, type UiTheme } from '@/lib/theme';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link to="/" className="mb-8" aria-label="Laito">
        <Logo />
      </Link>
      <Card className="w-full max-w-md animate-rise p-6 sm:p-8">
        <h1 className="text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </Card>
    </div>
  );
}

function FormError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
      {msg}
    </p>
  );
}

// ───────────────────────── Connexion ─────────────────────────
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setUnverified(false);
    try {
      await login({ email, password });
      navigate(params.get('next') || '/', { replace: true });
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 403 && err.code === 'EMAIL_NOT_VERIFIED') {
        setUnverified(true);
      } else if (err instanceof ApiRequestError && err.status === 401) {
        setError('E-mail ou mot de passe incorrect.');
      } else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Bon retour" subtitle="Retrouvez vos carnets là où vous les avez laissés.">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <TextField label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormError msg={error} />
        {unverified && (
          <div role="alert" className="rounded-md border border-line bg-page px-3 py-3 text-sm">
            <p>Votre adresse n’est pas encore vérifiée. Ouvrez le lien reçu par e-mail pour activer votre compte.</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2"
              disabled={resent}
              onClick={async () => {
                await authApi.resendVerification(email).catch(() => undefined);
                setResent(true);
              }}
            >
              {resent ? 'E-mail renvoyé' : 'Renvoyer l’e-mail'}
            </Button>
          </div>
        )}
        <Button type="submit" busy={busy} size="lg">
          Se connecter
        </Button>
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <Link to="/mot-de-passe-oublie" className="text-accent-text underline-offset-2 hover:underline">
            Mot de passe oublié ?
          </Link>
          <Link to="/inscription" className="text-accent-text underline-offset-2 hover:underline">
            Créer un compte
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

// ───────────────────────── Inscription ─────────────────────────
const THEMES: { value: UiTheme; label: string; swatch: string; fg: string }[] = [
  { value: 'parchment', label: 'Parchemin', swatch: '#F3E9D7', fg: '#3E2A1E' },
  { value: 'light', label: 'Clair', swatch: '#FFFDF8', fg: '#2B2622' },
  { value: 'night', label: 'Nuit', swatch: '#231B15', fg: '#ECDFC8' },
];
const SIZES = [
  { value: 15, label: 'A', hint: 'Petit' },
  { value: 16, label: 'A', hint: 'Normal' },
  { value: 18, label: 'A', hint: 'Grand' },
];

export function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', username: '', displayName: '' });
  const [theme, setTheme] = useState<UiTheme>(storedTheme());
  const [size, setSize] = useState(16);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const pwdError =
    form.password && form.password.length < PASSWORD_MIN_LENGTH
      ? `Au moins ${PASSWORD_MIN_LENGTH} caractères.`
      : null;
  const userError =
    form.username && !/^[a-z0-9_.-]{3,30}$/i.test(form.username)
      ? '3 à 30 caractères : lettres, chiffres, tiret, point ou _.'
      : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdError || userError) return;
    setBusy(true);
    setError(null);
    try {
      const readerFont = size === 15 ? 18 : size === 18 ? 21 : 19;
      await authApi.register({
        email: form.email,
        password: form.password,
        username: form.username,
        displayName: form.displayName || undefined,
        theme: theme as ThemeName,
        fontSize: readerFont,
      });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthLayout title="Vérifiez votre boîte mail" subtitle={`Un lien d’activation a été envoyé à ${form.email}.`}>
        <p className="text-muted">
          Cliquez sur le lien pour activer votre compte. Vous arriverez directement sur la création de votre premier livre.
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => authApi.resendVerification(form.email).catch(() => undefined)}
        >
          Renvoyer l’e-mail
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Créer votre carnet" subtitle="Quelques secondes, et la page blanche est à vous.">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <TextField label="E-mail" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        <TextField
          label="Mot de passe"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          value={form.password}
          onChange={set('password')}
          error={pwdError}
          hint={`${PASSWORD_MIN_LENGTH} caractères minimum.`}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Pseudo"
            autoComplete="username"
            required
            value={form.username}
            onChange={set('username')}
            error={userError}
          />
          <TextField label="Nom affiché" value={form.displayName} onChange={set('displayName')} placeholder="Facultatif" />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Thème</legend>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <label
                key={t.value}
                className={cx(
                  'pressable flex cursor-pointer flex-col items-center gap-1.5 rounded-md border p-2 text-sm',
                  theme === t.value ? 'border-accent-text shadow-soft' : 'border-line',
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  className="sr-only"
                  checked={theme === t.value}
                  onChange={() => {
                    setTheme(t.value);
                    applyTheme(t.value);
                  }}
                />
                <span
                  className="flex h-10 w-full items-center justify-center rounded-sm border border-line font-serif"
                  style={{ background: t.swatch, color: t.fg }}
                >
                  Aa
                </span>
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Taille du texte</legend>
          <div className="grid grid-cols-3 gap-2">
            {SIZES.map((s) => (
              <label
                key={s.value}
                className={cx(
                  'pressable flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border',
                  size === s.value ? 'border-accent-text shadow-soft' : 'border-line',
                )}
              >
                <input
                  type="radio"
                  name="size"
                  className="sr-only"
                  checked={size === s.value}
                  onChange={() => {
                    setSize(s.value);
                    applyUiFontSize(s.value);
                  }}
                />
                <span className="font-serif" style={{ fontSize: s.value + 2 }} aria-hidden>
                  {s.label}
                </span>
                <span className="text-sm">{s.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <FormError msg={error} />
        <p className="text-xs text-muted">
          En créant un compte, vous acceptez que vos données soient traitées pour faire fonctionner Laito. Vous pouvez les
          exporter ou les supprimer à tout moment depuis les paramètres.
        </p>
        <Button type="submit" size="lg" busy={busy}>
          Créer mon compte
        </Button>
        <p className="text-center text-sm">
          Déjà inscrit ?{' '}
          <Link to="/connexion" className="text-accent-text underline-offset-2 hover:underline">
            Se connecter
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

// ───────────────────────── Vérification ─────────────────────────
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { acceptAuth } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(token ? null : 'Lien de vérification incomplet.');
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    authApi
      .verifyEmail(token)
      .then((res) => {
        acceptAuth(res);
        navigate('/ecrire?premier=1', { replace: true });
      })
      .catch((e) => setError(e instanceof ApiRequestError && e.status === 400 ? 'Ce lien a expiré ou a déjà été utilisé.' : errorMessage(e)));
  }, [token, acceptAuth, navigate]);

  return (
    <AuthLayout title="Vérification de l’e-mail">
      {error ? (
        <div className="flex flex-col gap-4">
          <FormError msg={error} />
          <Link to="/connexion" className="text-accent-text underline-offset-2 hover:underline">
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-muted">
          <Icon name="sparkle" className="text-accent-text" /> Activation de votre compte…
        </p>
      )}
    </AuthLayout>
  );
}

// ───────────────────────── Mot de passe ─────────────────────────
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <AuthLayout title="Mot de passe oublié" subtitle="Nous vous enverrons un lien pour en choisir un nouveau.">
      {sent ? (
        <p className="text-muted">Si un compte existe pour {email}, un e-mail vient de partir. Pensez à vérifier vos indésirables.</p>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            await authApi.forgotPassword(email).catch(() => undefined);
            setBusy(false);
            setSent(true);
          }}
        >
          <TextField label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" busy={busy}>
            Envoyer le lien
          </Button>
        </form>
      )}
      <Link to="/connexion" className="mt-4 inline-block text-sm text-accent-text underline-offset-2 hover:underline">
        Retour à la connexion
      </Link>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const short = password.length > 0 && password.length < PASSWORD_MIN_LENGTH;
  return (
    <AuthLayout title="Nouveau mot de passe">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (short) return;
          setBusy(true);
          setError(null);
          try {
            await authApi.resetPassword(token, password);
            navigate('/connexion', { replace: true });
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <TextField
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={short ? `Au moins ${PASSWORD_MIN_LENGTH} caractères.` : null}
        />
        <FormError msg={error} />
        <Button type="submit" busy={busy} disabled={!token}>
          Enregistrer
        </Button>
      </form>
    </AuthLayout>
  );
}
