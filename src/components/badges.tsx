import {
  STATUS_LABELS,
  VISIBILITIES,
  VISIBILITY_LABELS,
  type Visibility,
  type WritingStatus,
} from '@laito/shared';
import { Icon, type IconName } from './ui/Icon';
import { cx } from './ui/primitives';

export const VISIBILITY_ICONS: Record<Visibility, IconName> = {
  private: 'lock',
  friends: 'users',
  link: 'link',
  public: 'globe',
};

export const VISIBILITY_HINTS: Record<Visibility, string> = {
  private: 'Vous seul pouvez lire.',
  friends: 'Vos amis peuvent lire.',
  link: 'Toute personne disposant du lien.',
  public: 'Visible par tous, dans le catalogue.',
};

/** Badge de visibilité : toujours icône + libellé. */
export function VisibilityBadge({ value, className }: { value: Visibility; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border border-line bg-page/70 px-2 py-0.5 text-xs font-medium text-fg',
        className,
      )}
    >
      <Icon name={VISIBILITY_ICONS[value]} size={13} />
      {VISIBILITY_LABELS[value]}
    </span>
  );
}

const statusTone: Record<WritingStatus, string> = {
  draft: 'bg-fg/[0.06] text-muted',
  in_progress: 'bg-leather/15 text-fg',
  finished: 'bg-gold/20 text-fg',
  published: 'bg-accent text-accent-fg',
};

export function StatusBadge({ value, className }: { value: WritingStatus; className?: string }) {
  return (
    <span
      className={cx('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusTone[value], className)}
    >
      {STATUS_LABELS[value]}
    </span>
  );
}

/** Sélecteur de visibilité en boutons radio (icône + libellé + aide). */
export function VisibilityPicker({
  value,
  onChange,
  name,
  disabled,
}: {
  value: Visibility;
  onChange: (v: Visibility) => void;
  name: string;
  disabled?: boolean;
}) {
  return (
    <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-4" disabled={disabled}>
      <legend className="sr-only">Visibilité</legend>
      {VISIBILITIES.map((v) => (
        <label
          key={v}
          className={cx(
            'pressable flex cursor-pointer flex-col gap-1 rounded-md border p-3 text-sm',
            value === v ? 'border-accent-text bg-page shadow-soft' : 'border-line hover:bg-page/60',
          )}
        >
          <input
            type="radio"
            name={name}
            value={v}
            checked={value === v}
            onChange={() => onChange(v)}
            className="sr-only"
          />
          <span className="flex items-center gap-1.5 font-medium">
            <Icon name={VISIBILITY_ICONS[v]} size={16} />
            {VISIBILITY_LABELS[v]}
          </span>
          <span className="text-xs text-muted">{VISIBILITY_HINTS[v]}</span>
        </label>
      ))}
    </fieldset>
  );
}
