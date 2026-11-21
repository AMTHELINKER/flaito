import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  STATUS_LABELS,
  VISIBILITIES,
  VISIBILITY_LABELS,
  WRITING_STATUSES,
  type ChapterDto,
  type UpdateChapterRequest,
} from '@laito/shared';
import { VISIBILITY_ICONS } from '@/components/badges';
import { Icon } from '@/components/ui/Icon';
import { Button, IconButton, cx } from '@/components/ui/primitives';

interface Props {
  bookId: string;
  bookTitle: string;
  chapters: ChapterDto[];
  currentId?: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onReorder: (ids: string[]) => void;
  onUpdate: (id: string, patch: UpdateChapterRequest) => void;
  onDelete: (ch: ChapterDto) => void;
  onClose?: () => void;
  adding?: boolean;
}

export function ChapterSidebar({
  bookId,
  bookTitle,
  chapters,
  currentId,
  onSelect,
  onAdd,
  onReorder,
  onUpdate,
  onDelete,
  onClose,
  adding,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= chapters.length || from === to) return;
    const ids = chapters.map((c) => c.id);
    const [x] = ids.splice(from, 1);
    ids.splice(to, 0, x);
    onReorder(ids);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-1 p-3 pb-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-muted">Livre</p>
          <h2 className="truncate text-lg" title={bookTitle}>
            {bookTitle}
          </h2>
        </div>
        <Link
          to={`/livres/${bookId}/reglages`}
          aria-label="Réglages du livre"
          title="Réglages du livre"
          className="pressable inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-fg/[0.07]"
        >
          <Icon name="settings" size={18} />
        </Link>
        {onClose && <IconButton icon="x" label="Fermer la liste des chapitres" onClick={onClose} />}
      </div>

      <ol className="flex-1 overflow-y-auto px-2" aria-label="Chapitres (glisser pour réorganiser)">
        {chapters.map((c, i) => (
          <li
            key={c.id}
            draggable={renaming !== c.id}
            onDragStart={(e) => {
              setDragId(c.id);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', c.id);
            }}
            onDragOver={(e) => {
              if (!dragId) return;
              e.preventDefault();
              setOverId(c.id);
            }}
            onDragLeave={() => setOverId((o) => (o === c.id ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              const from = chapters.findIndex((x) => x.id === dragId);
              move(from, i);
              setDragId(null);
              setOverId(null);
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            className={cx(
              'group relative mb-1 flex items-center rounded-md transition-[background-color,opacity] duration-150',
              c.id === currentId ? 'bg-page shadow-soft' : 'hover:bg-fg/[0.05]',
              dragId === c.id && 'opacity-40',
              overId === c.id && dragId !== c.id && 'ring-2 ring-accent/60',
            )}
          >
            <button
              type="button"
              className="flex h-11 w-7 shrink-0 cursor-grab items-center justify-center text-muted active:cursor-grabbing"
              aria-label={`Déplacer « ${c.title} » (Alt + flèches)`}
              onKeyDown={(e) => {
                if (e.altKey && e.key === 'ArrowUp') {
                  e.preventDefault();
                  move(i, i - 1);
                }
                if (e.altKey && e.key === 'ArrowDown') {
                  e.preventDefault();
                  move(i, i + 1);
                }
              }}
            >
              <Icon name="grip" size={16} strokeWidth={2.6} />
            </button>
            {renaming === c.id ? (
              <RenameInput
                initial={c.title}
                onDone={(title) => {
                  setRenaming(null);
                  if (title && title !== c.title) onUpdate(c.id, { title });
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                onDoubleClick={() => setRenaming(c.id)}
                aria-current={c.id === currentId ? 'page' : undefined}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{c.title}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <Icon name={VISIBILITY_ICONS[c.visibility]} size={12} />
                    {VISIBILITY_LABELS[c.visibility]} · {STATUS_LABELS[c.status]}
                  </span>
                </span>
              </button>
            )}
            <div className="relative">
              <IconButton
                icon="more"
                label={`Options de « ${c.title} »`}
                aria-haspopup="menu"
                aria-expanded={menu === c.id}
                onClick={() => setMenu(menu === c.id ? null : c.id)}
                className="opacity-70 group-hover:opacity-100"
              />
              {menu === c.id && (
                <ChapterMenu
                  chapter={c}
                  onClose={() => setMenu(null)}
                  onRename={() => {
                    setMenu(null);
                    setRenaming(c.id);
                  }}
                  onUpdate={(p) => onUpdate(c.id, p)}
                  onDelete={() => {
                    setMenu(null);
                    onDelete(c);
                  }}
                />
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-2 border-t border-line p-3">
        <Button variant="secondary" icon="plus" onClick={onAdd} busy={adding}>
          Nouveau chapitre
        </Button>
      </div>
    </div>
  );
}

function RenameInput({ initial, onDone }: { initial: string; onDone: (v: string) => void }) {
  const [v, setV] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.select();
  }, []);
  return (
    <input
      ref={ref}
      aria-label="Nouveau titre du chapitre"
      value={v}
      maxLength={200}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onDone(v.trim())}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onDone(v.trim());
        if (e.key === 'Escape') onDone(initial);
      }}
      className="min-h-9 min-w-0 flex-1 rounded-sm border border-accent-text bg-page px-2 text-sm focus:outline-none"
    />
  );
}

function ChapterMenu({
  chapter,
  onClose,
  onRename,
  onUpdate,
  onDelete,
}: {
  chapter: ChapterDto;
  onClose: () => void;
  onRename: () => void;
  onUpdate: (p: UpdateChapterRequest) => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('button, select')?.focus();
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return (
    <div
      ref={ref}
      role="menu"
      className="glass absolute right-0 top-11 z-30 flex w-60 flex-col gap-2 rounded-lg p-3 text-sm animate-rise"
    >
      <button
        type="button"
        role="menuitem"
        onClick={onRename}
        className="pressable flex min-h-10 items-center gap-2 rounded-sm px-2 hover:bg-fg/[0.06]"
      >
        <Icon name="edit" size={16} /> Renommer
      </button>
      <label className="flex flex-col gap-1 px-2">
        <span className="text-xs text-muted">Statut</span>
        <select
          value={chapter.status}
          onChange={(e) => onUpdate({ status: e.target.value as ChapterDto['status'] })}
          className="min-h-10 rounded-sm border border-line bg-page px-2"
        >
          {WRITING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 px-2">
        <span className="text-xs text-muted">Visibilité</span>
        <select
          value={chapter.visibility}
          onChange={(e) => onUpdate({ visibility: e.target.value as ChapterDto['visibility'] })}
          className="min-h-10 rounded-sm border border-line bg-page px-2"
        >
          {VISIBILITIES.map((v) => (
            <option key={v} value={v}>
              {VISIBILITY_LABELS[v]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        role="menuitem"
        onClick={onDelete}
        className="pressable flex min-h-10 items-center gap-2 rounded-sm px-2 text-danger hover:bg-danger/10"
      >
        <Icon name="trash" size={16} /> Supprimer
      </button>
    </div>
  );
}
