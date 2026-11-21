import { cx } from './ui/primitives';

export function Logo({ className, withName = true }: { className?: string; withName?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <span
        aria-hidden
        className="relative flex h-8 w-8 items-center justify-center rounded-[9px] bg-parchment font-serif text-xl font-semibold text-ink shadow-soft ring-1 ring-ink/10"
      >
        L
        <span className="absolute bottom-[5px] left-2 right-2 h-px bg-gold" />
      </span>
      {withName && <span className="font-serif text-xl tracking-wide">Laito</span>}
    </span>
  );
}
