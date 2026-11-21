import { useEffect, useState } from 'react';

const COLORS = ['#B8893B', '#8B5E3C', '#E6D3B3', '#D0A252'];

/** Petite pluie de paillettes dorées à la publication d'un chapitre. */
export function Celebration({ trigger }: { trigger: number }) {
  const [pieces, setPieces] = useState<
    { id: number; dx: number; dy: number; rot: number; color: string; left: number }[]
  >([]);
  useEffect(() => {
    if (!trigger) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const ps = Array.from({ length: 28 }, (_, i) => ({
      id: trigger * 100 + i,
      dx: (Math.random() - 0.5) * 320,
      dy: -120 - Math.random() * 220,
      rot: Math.random() * 540,
      color: COLORS[i % COLORS.length],
      left: 45 + Math.random() * 10,
    }));
    setPieces(ps);
    const t = window.setTimeout(() => setPieces([]), 1200);
    return () => window.clearTimeout(t);
  }, [trigger]);

  if (!pieces.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute bottom-1/3 h-2 w-1.5 rounded-[1px]"
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              animation: 'confetti 1100ms cubic-bezier(0.2,0.7,0.2,1) forwards',
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              '--rot': `${p.rot}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
