import { Icon, type IconName } from '@/components/ui/Icon';

export type FormatAction = 'bold' | 'italic' | 'heading' | 'quote' | 'list' | 'center' | 'scene';

const ACTIONS: { id: FormatAction; icon: IconName; label: string; kbd?: string }[] = [
  { id: 'bold', icon: 'bold', label: 'Gras', kbd: 'Ctrl+B' },
  { id: 'italic', icon: 'italic', label: 'Italique', kbd: 'Ctrl+I' },
  { id: 'heading', icon: 'heading', label: 'Titre' },
  { id: 'quote', icon: 'quote', label: 'Citation' },
  { id: 'list', icon: 'list', label: 'Liste' },
  { id: 'center', icon: 'alignCenter', label: 'Centrer' },
  { id: 'scene', icon: 'separator', label: 'Séparateur de scène' },
];

/** Barre de mise en forme discrète, qui apparaît à la sélection du texte. */
export function FormatToolbar({
  pos,
  onAction,
}: {
  pos: { top: number; left: number } | null;
  onAction: (a: FormatAction) => void;
}) {
  if (!pos) return null;
  return (
    <div
      role="toolbar"
      aria-label="Mise en forme"
      className="glass absolute z-30 flex -translate-x-1/2 -translate-y-full gap-0.5 rounded-lg p-1 animate-fade-in"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.preventDefault() /* garde la sélection */}
    >
      {ACTIONS.map((a) => (
        <button
          key={a.id}
          type="button"
          title={a.kbd ? `${a.label} (${a.kbd})` : a.label}
          aria-label={a.label}
          onClick={() => onAction(a.id)}
          className="pressable inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-fg/[0.08]"
        >
          <Icon name={a.icon} size={18} />
        </button>
      ))}
    </div>
  );
}
