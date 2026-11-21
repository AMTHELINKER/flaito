import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { errorMessage } from '@/api/client';
import { meApi } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import {
  Button,
  Disclosure,
  PageHeader,
  Section,
  SelectField,
  Switch,
  TextField,
  cx,
} from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { useReadingPrefs } from '@/hooks/useReadingPrefs';
import { applyUiFontSize, toUiTheme, type UiTheme } from '@/lib/theme';
import { READER_THEMES } from '../reader/ReaderSettings';

export function SettingsPage() {
  const { user, updateSettings } = useAuth();
  const toast = useToast();
  const [prefs, setPrefs] = useReadingPrefs();
  const [deleting, setDeleting] = useState(false);
  const [uiSize, setUiSize] = useState(
    () => parseFloat(document.documentElement.style.fontSize) || 16,
  );

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
      {/* Trois sections seulement ; les réglages fins restent repliés (loi de Hick). */}
      <div className="flex flex-col gap-5">
        <Section id="p-app" title="Apparence">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Thème</legend>
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
                    'pressable flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent',
                    toUiTheme(s.theme) === v
                      ? 'border-accent-text bg-page font-semibold shadow-soft'
                      : 'border-line',
                  )}
                >
                  <input
                    type="radio"
                    name="ui-theme"
                    className="sr-only"
                    checked={toUiTheme(s.theme) === v}
                    onChange={() => set({ theme: v })}
                  />
                  <Icon name={icon} size={16} /> {label}
                </label>
              ))}
            </div>
          </fieldset>
          <Disclosure summary="Taille du texte de l’interface" className="mt-3">
            <label className="flex flex-col gap-1.5">
              <span className="flex justify-between text-sm font-medium">
                Taille <span className="tabular-nums text-muted">{uiSize} px</span>
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
          </Disclosure>
        </Section>

        <Section
          id="p-read"
          title="Lecture"
          description="Vous suivent sur tous vos appareils. Également réglables depuis le lecteur."
        >
          <div className="grid grid-cols-4 gap-2">
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
                <span
                  className="flex h-9 w-full items-center justify-center rounded-sm font-serif"
                  style={{ background: t.bg, color: t.fg }}
                >
                  Aa
                </span>
                {t.label}
              </button>
            ))}
          </div>
          <label className="mt-4 flex flex-col gap-1.5">
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
          <Disclosure summary="Police, mise en page, justification" className="mt-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Police"
                value={prefs.fontFamily}
                onChange={(e) =>
                  setPrefs({ fontFamily: e.target.value as typeof prefs.fontFamily })
                }
              >
                <option value="literata">Literata</option>
                <option value="lora">Lora</option>
                <option value="inter">Inter</option>
              </SelectField>
              <SelectField
                label="Mise en page"
                value={prefs.mode}
                onChange={(e) => setPrefs({ mode: e.target.value as typeof prefs.mode })}
              >
                <option value="scroll">Défilement continu</option>
                <option value="paged">Pages tournées</option>
              </SelectField>
            </div>
            <Switch
              checked={prefs.justify}
              onChange={(justify) => setPrefs({ justify })}
              label="Texte justifié"
            />
          </Disclosure>
        </Section>

        <Section id="p-account" title="Compte">
          <Switch
            checked={s.notificationsEnabled}
            onChange={(notificationsEnabled) => set({ notificationsEnabled })}
            label="Notifications"
            description="Nouveaux chapitres, commentaires et demandes d’amis."
          />
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <Button variant="secondary" icon="download" onClick={exportData}>
              Exporter mes données
            </Button>
          </div>
          <Disclosure summary="Supprimer mon compte" className="mt-2">
            <p className="text-sm text-muted">
              Vos livres, chapitres, liens et réglages seront définitivement supprimés. Pensez à
              exporter vos données avant.
            </p>
            <div>
              <Button variant="danger" size="sm" icon="trash" onClick={() => setDeleting(true)}>
                Supprimer mon compte
              </Button>
            </div>
          </Disclosure>
        </Section>
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
          <Button
            variant="danger"
            busy={del.isPending}
            disabled={!password}
            onClick={() => del.mutate()}
          >
            Supprimer définitivement
          </Button>
        </>
      }
    >
      <p className="mb-4 text-muted">
        Vos livres, chapitres, liens de partage et réglages seront supprimés. Pensez à exporter vos
        données avant. Cette action est irréversible.
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
