import { cx } from './ui/primitives';

const hues = ['#8B5E3C', '#6E4A2F', '#7A5A1F', '#5C3F2B', '#9A6B43'];

/** Couverture du livre, ou couverture générée façon reliure cuir. */
export function BookCover({
  title,
  coverUrl,
  className,
}: {
  title: string;
  coverUrl: string | null;
  className?: string;
}) {
  if (coverUrl) {
    return (
      <img
        src={coverUrl}
        alt=""
        loading="lazy"
        className={cx('aspect-[2/3] w-full rounded-md object-cover shadow-soft', className)}
      />
    );
  }
  const hue = hues[[...title].reduce((a, c) => a + c.charCodeAt(0), 0) % hues.length];
  return (
    <div
      aria-hidden
      className={cx(
        'relative flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-md p-3 text-center shadow-soft',
        className,
      )}
      style={{ background: `linear-gradient(135deg, ${hue}, #3E2A1E)` }}
    >
      <span className="absolute inset-y-0 left-2 w-px bg-white/15" />
      <span className="absolute inset-2 rounded-sm border border-gold/50" />
      <span className="line-clamp-4 font-serif text-sm leading-snug text-parchment">{title}</span>
    </div>
  );
}
