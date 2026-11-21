import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FriendDto, Locale } from '@laito/shared';
import { errorMessage } from '@/api/client';
import { friendsApi, meApi, qk } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { Button, Card, IconButton, PageHeader, SelectField, Skeleton, Switch, TextField, cx } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { useReadingPrefs } from '@/hooks/useReadingPrefs';
import { applyUiFontSize, toUiTheme, type UiTheme } from '@/lib/theme';
import { READER_THEMES } from '../reader/ReaderSettings';
import { Avatar } from '../profile/ProfilePages';

export function SettingsPage() {
  const { user, updateSettings, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useReadingPrefs();
  const [deleting, setDeleting] = useState(false);
  const [uiSize, setUiSize] = useState(() => parseFloat(document.documentElement.style.fontSize) || 16);

  if (!user) return null;
  const s = user.settings;
  const set = (patch: Parameters<typeof updateSettings>[0]) =>
    updateSettings(patch).catch((e) => toast.error(errorMessage(e)));

  const exportData = async () => {
    try {
      const data = await meApi.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `laito-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Paramètres" subtitle={user.email} />
      <div className="flex flex-col gap-5">
        <Card as="section" aria-labelledby="p-app">
          <h2 id="p-app" className="mb-4 text-xl">
            Apparence
          </h2>
          <fieldset className="mb-4">
            <legend className="mb-2 text-sm font-medium">Thème de l’interface</legend>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['parchment', 'Parchemin', 'sun'],
                  ['light', 'Clair', 'sun'],
                  ['night', 'Nuit', 'moon'],
                ] as [UiTheme, string, 'sun' | 'moon'][]
              ).map(([v, label, icon]) => (
                <label
                  key={v}
                  className={cx(
                    'pressable flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border text-sm',
                    toUiTheme(s.theme) === v ? 'border-accent-text bg-page font-semibold shadow-soft' : 'border-line',
                  )}
                >
                  <input type="radio" name="ui-theme" className="sr-only" checked={toUiTheme(s.theme) === v} onChange={() => set({ theme: v })} />
                  <Icon name={icon} size={16} /> {label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5">
            <span className="flex justify-between text-sm font-medium">
              Taille du texte de l’interface <span className="tabular-nums text-muted">{uiSize} px</span>
            </span>
            <input
              type="range"
              min={14}
              max={20}
              value={uiSize}
              onChange={(e) => {
                const v = Number(e.target.value);
                setUiSize(v);
                applyUiFontSize(v);
              }}
              className="h-11 accent-[var(--c-accent-text)]"
            />
          </label>
          <SelectField label="Langue" value={s.locale} onChange={(e) => set({ locale: e.target.value as Locale })} className="mt-2">
            <option value="fr">Français</option>
            <option value="en">English (bientôt)</option>
          </SelectField>
        </Card>

        <Card as="section" aria-labelledby="p-read">
          <h2 id="p-read" className="mb-4 text-xl">
            Lecture
          </h2>
          <p className="mb-3 text-sm text-muted">Ces réglages vous suivent sur tous vos appareils.</p>
          <div className="mb-4 grid grid-cols-4 gap-2">
            {READER_THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                aria-pressed={prefs.theme === t.value}
                onClick={() => setPrefs({ theme: t.value })}
                className={cx(
                  'pressable flex flex-col items-center gap-1 rounded-md border p-2 text-xs',
                  prefs.theme === t.value ? 'border-accent-text shadow-soft' : 'border-line',
                )}
              >
                <span className="flex h-9 w-full items-center justify-center rounded-sm font-serif" style={{ background: t.bg, color: t.fg }}>
                  Aa
                </span>
                {t.label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Police" value={prefs.fontFamily} onChange={(e) => setPrefs({ fontFamily: e.target.value as typeof prefs.fontFamily })}>
              <option value="literata">Literata</option>
              <option value="lora">Lora</option>
              <option value="inter">Inter</option>
            </SelectField>
            <SelectField label="Mode" value={prefs.mode} onChange={(e) => setPrefs({ mode: e.target.value as typeof prefs.mode })}>
              <option value="scroll">Défilement continu</option>
              <option value="paged">Pages tournées</option>
            </SelectField>
          </div>
          <label className="mt-3 flex flex-col gap-1.5">
            <span className="flex justify-between text-sm font-medium">
              Taille du texte <span className="tabular-nums text-muted">{prefs.fontSize} px</span>
            </span>
            <input
              type="range"
              min={14}
              max={28}
              value={prefs.fontSize}
              onChange={(e) => setPrefs({ fontSize: Number(e.target.value) })}
              className="h-11 accent-[var(--c-accent-text)]"
            />
          </label>
          <Switch checked={prefs.justify} onChange={(justify) => setPrefs({ justify })} label="Texte justifié" />
        </Card>

        <Card as="section" aria-labelledby="p-notif">
          <h2 id="p-notif" className="mb-2 text-xl">
            Notifications
          </h2>
          <Switch
            checked={s.notificationsEnabled}
            onChange={(notificationsEnabled) => set({ notificationsEnabled })}
            label="Recevoir des notifications"
            description="Nouveaux chapitres, commentaires et demandes d’amis."
          />
        </Card>

        <Friends />

        <Card as="section" aria-labelledby="p-data">
          <h2 id="p-data" className="mb-2 text-xl">
            Mes données
          </h2>
          <p className="mb-4 text-sm text-muted">Téléchargez une copie complète de vos livres, chapitres et réglages (format JSON).</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon="download" onClick={exportData}>
              Exporter mes données
            </Button>
            <a
              href="mailto:avis@laito.app?subject=Mon%20avis%20sur%20Laito"
              className="pressable inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-sm hover:bg-fg/[0.06]"
            >
              <Icon name="mail" size={18} /> Donner mon avis
            </a>
          </div>
        </Card>

        <Card as="section" className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            icon="logOut"
            onClick={async () => {
              await logout();
              navigate('/connexion', { replace: true });
            }}
          >
            Se déconnecter
          </Button>
          <Button variant="ghost" className="text-danger" icon="trash" onClick={() => setDeleting(true)}>
            Supprimer mon compte
          </Button>
        </Card>
      </div>
      <DeleteAccount open={deleting} onClose={() => setDeleting(false)} />
    </div>
  );
}

function DeleteAccount({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const del = useMutation({
    mutationFn: () => meApi.deleteAccount(password),
    onSuccess: async () => {
      await logout();
      navigate('/connexion', { replace: true });
    },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Supprimer mon compte"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="danger" busy={del.isPending} disabled={!password} onClick={() => del.mutate()}>
            Supprimer définitivement
          </Button>
        </>
      }
    >
      <p className="mb-4 text-muted">
        Vos livres, chapitres, liens de partage et réglages seront supprimés. Pensez à exporter vos données avant. Cette action est
        irréversible.
      </p>
      <TextField
        label="Confirmez avec votre mot de passe"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError(null);
        }}
        error={error}
      />
    </Modal>
  );
}

function Friends() {
  const qc = useQueryClient();
  const toast = useToast();
  const friends = useQuery({ queryKey: qk.friends, queryFn: friendsApi.list });
  const [username, setUsername] = useState('');
  const add = useMutation({
    mutationFn: (u: string) => friendsApi.add(u),
    onSuccess: (f) => {
      setUsername('');
      void qc.invalidateQueries({ queryKey: qk.friends });
      toast.success(f.status === 'accepted' ? `Vous êtes maintenant amis avec ${f.displayName}.` : 'Demande envoyée.');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => friendsApi.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.friends }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const label = (f: FriendDto) =>
    f.status === 'accepted' ? 'Ami' : f.direction === 'incoming' ? 'Demande reçue' : 'Demande envoyée';

  return (
    <Card as="section" aria-labelledby="p-friends">
      <h2 id="p-friends" className="mb-1 text-xl">
        Amis
      </h2>
      <p className="mb-4 text-sm text-muted">Vos amis peuvent lire les livres et chapitres en visibilité « Amis ».</p>
      <form
        className="mb-4 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (username.trim()) add.mutate(username.trim().replace(/^@/, ''));
        }}
      >
        <TextField label="Ajouter par pseudo" placeholder="@pseudo" value={username} onChange={(e) => setUsername(e.target.value)} className="flex-1" />
        <Button type="submit" icon="plus" busy={add.isPending}>
          Ajouter
        </Button>
      </form>
      {friends.isLoading ? (
        <Skeleton className="h-12" />
      ) : friends.data?.length ? (
        <ul className="flex flex-col gap-2">
          {friends.data.map((f) => (
            <li key={f.userId} className="flex items-center gap-3 rounded-md border border-line bg-page/70 p-2 pl-3">
              <Avatar profile={f} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.displayName}</p>
                <p className="text-xs text-muted">
                  @{f.username} · {label(f)}
                </p>
              </div>
              {f.status === 'pending' && f.direction === 'incoming' && (
                <Button size="sm" onClick={() => add.mutate(f.username)}>
                  Accepter
                </Button>
              )}
              <IconButton icon="x" label={`Retirer ${f.displayName}`} onClick={() => remove.mutate(f.userId)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Pas encore d’amis sur Laito.</p>
      )}
    </Card>
  );
}
