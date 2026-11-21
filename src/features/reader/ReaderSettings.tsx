import { useEffect, useRef } from 'react';
import type { ReadingPreferences } from '@laito/shared';
import { IconButton, Switch, cx } from '@/components/ui/primitives';

export const READER_THEMES: { value: ReadingPreferences['theme']; label: string; bg: string; fg: string }[] = [
  { value: 'parchment', label: 'Parchemin', bg: '#F7EFDF', fg: '#3E2A1E' },
  { value: 'light', label: 'Papier clair', bg: '#FFFDF9', fg: '#2B2622' },
  { value: 'sepia', label: 'Sépia', bg: '#EFDFC2', fg: '#3B2716' },
  { value: 'night', label: 'Nuit chaude', bg: '#211912', fg: '#E3D3B8' },
];

const FONTS: { value: ReadingPreferences['fontFamily']; label: string; css: string }[] = [
  { value: 'literata', label: 'Literata', css: "'Literata', serif" },
  { value: 'lora', label: 'Lora', css: "'Lora', serif" },
  { value: 'inter', label: 'Inter', css: "'Inter', sans-serif" },
];

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-medium uppercase tracking-wider opacity-75">{label}</legend>
      <div className="flex gap-1 rounded-md bg-black/5 p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={cx(
              'pressable flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-sm text-sm',
              value === o.value ? 'bg-[var(--r-page)] font-semibold shadow-sm' : 'opacity-80',
            )}
          >
            <input type="radio" className="sr-only" checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Réglages de lecture accessibles en un geste. */
export function ReaderSettings({
  prefs,
  onChange,
  onClose,
}: {
  prefs: ReadingPreferences;
  onChange: (p: Partial<ReadingPreferences>) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('input')?.focus();
  }, []);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Réglages de lecture"
      className="glass fixed inset-x-2 bottom-2 z-40 max-h-[80dvh] overflow-y-auto rounded-xl p-4 animate-rise sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-16 sm:w-[22rem]"
      style={{ color: 'var(--r-fg)' }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg">Lecture</h2>
        <IconButton icon="x" label="Fermer les réglages" onClick={onClose} className="text-[inherit]" />
      </div>
      <div className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium uppercase tracking-wider opacity-75">Thème</legend>
          <div className="grid grid-cols-4 gap-2">
            {READER_THEMES.map((t) => (
              <label key={t.value} className="flex cursor-pointer flex-col items-center gap-1 text-xs">
                <input
                  type="radio"
                  name="reader-theme"
                  className="peer sr-only"
                  checked={prefs.theme === t.value}
                  onChange={() => onChange({ theme: t.value })}
                />
                <span
                  className={cx(
                    'pressable flex h-11 w-full items-center justify-center rounded-md border font-serif text-base peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--r-ornament)]',
                    prefs.theme === t.value ? 'border-[var(--r-ornament)] ring-1 ring-[var(--r-ornament)]' : 'border-black/10',
                  )}
                  style={{ background: t.bg, color: t.fg }}
                >
                  Aa
                </span>
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium uppercase tracking-wider opacity-75">Police</legend>
          <div className="flex gap-1 rounded-md bg-black/5 p-1">
            {FONTS.map((f) => (
              <label
                key={f.value}
                className={cx(
                  'pressable flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-sm',
                  prefs.fontFamily === f.value ? 'bg-[var(--r-page)] font-semibold shadow-sm' : 'opacity-80',
                )}
                style={{ fontFamily: f.css }}
              >
                <input
                  type="radio"
                  className="sr-only"
                  checked={prefs.fontFamily === f.value}
                  onChange={() => onChange({ fontFamily: f.value })}
                />
                {f.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="flex justify-between text-xs font-medium uppercase tracking-wider opacity-75">
            Taille <span className="tabular-nums">{prefs.fontSize} px</span>
          </span>
          <input
            type="range"
            min={14}
            max={28}
            step={1}
            value={prefs.fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            className="h-11 accent-[var(--r-ornament)]"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="flex justify-between text-xs font-medium uppercase tracking-wider opacity-75">
            Interligne <span className="tabular-nums">{prefs.lineHeight.toFixed(1)}</span>
          </span>
          <input
            type="range"
            min={1.3}
            max={2.2}
            step={0.1}
            value={prefs.lineHeight}
            onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
            className="h-11 accent-[var(--r-ornament)]"
          />
        </label>

        <Segmented
          label="Marges"
          value={prefs.margin}
          onChange={(margin) => onChange({ margin })}
          options={[
            { value: 'narrow', label: 'Étroites' },
            { value: 'normal', label: 'Normales' },
            { value: 'wide', label: 'Larges' },
          ]}
        />
        <Segmented
          label="Mode"
          value={prefs.mode}
          onChange={(mode) => onChange({ mode })}
          options={[
            { value: 'scroll', label: 'Défilement' },
            { value: 'paged', label: 'Pages' },
          ]}
        />
        <Switch checked={prefs.justify} onChange={(justify) => onChange({ justify })} label="Texte justifié" />
      </div>
    </div>
  );
}
