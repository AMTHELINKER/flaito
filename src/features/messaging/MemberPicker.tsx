import { useMemo, useState } from 'react';
import type { PublicProfileDto } from '@laito/shared';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/ui/Icon';
import { cx } from '@/components/ui/primitives';

/** Liste d'amis filtrable, à sélection multiple. */
export function MemberPicker({
  people,
  selected,
  onToggle,
  emptyText,
}: {
  people: PublicProfileDto[];
  selected: Set<string>;
  onToggle: (userId: string) => void;
  emptyText: string;
}) {
  const [filter, setFilter] = useState('');
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase().replace(/^@/, '');
    return f
      ? people.filter(
          (p) => p.displayName.toLowerCase().includes(f) || p.username.toLowerCase().includes(f),
        )
      : people;
  }, [people, filter]);

  if (!people.length) return <p className="py-4 text-center text-sm text-muted">{emptyText}</p>;
  return (
    <div className="flex flex-col gap-2">
      {people.length > 6 && (
        <div className="relative">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            aria-label="Filtrer vos amis"
            placeholder="Filtrer"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="min-h-11 w-full rounded-md border border-line bg-page/80 pl-10 pr-3 focus:border-accent-text focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      )}
      <ul
        className="flex max-h-[45dvh] flex-col gap-0.5 overflow-y-auto"
        role="group"
        aria-label="Amis"
      >
        {shown.map((p) => {
          const on = selected.has(p.userId);
          return (
            <li key={p.userId}>
              <label
                className={cx(
                  'pressable flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent',
                  on ? 'bg-accent/15' : 'hover:bg-fg/[0.05]',
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() => onToggle(p.userId)}
                />
                <Avatar profile={p} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.displayName}</span>
                  <span className="block truncate text-xs text-muted">@{p.username}</span>
                </span>
                <span
                  aria-hidden
                  className={cx(
                    'flex h-6 w-6 items-center justify-center rounded-full border',
                    on ? 'border-accent bg-accent text-accent-fg' : 'border-line',
                  )}
                >
                  {on && <Icon name="check" size={14} strokeWidth={2.2} />}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
