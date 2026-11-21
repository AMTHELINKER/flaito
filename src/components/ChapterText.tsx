import { Fragment, useMemo } from 'react';
import { parseChapter, type Block, type Inline } from '@laito/shared';

function renderInline(nodes: Inline[]): React.ReactNode {
  return nodes.map((n, i) => {
    if (n.type === 'text') return <Fragment key={i}>{n.text}</Fragment>;
    if (n.type === 'bold') return <strong key={i}>{renderInline(n.children)}</strong>;
    return <em key={i}>{renderInline(n.children)}</em>;
  });
}

/**
 * Rendu du texte d'un chapitre. Chaque bloc porte `data-block` (index) :
 * c'est la « position » enregistrée pour la reprise de lecture.
 */
export function ChapterText({ content, dropCap = true }: { content: string; dropCap?: boolean }) {
  const blocks = useMemo(() => parseChapter(content), [content]);
  const firstPara = blocks.findIndex((b) => b.type === 'paragraph');
  return (
    <>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} index={i} dropCap={dropCap && i === firstPara} />
      ))}
    </>
  );
}

function BlockView({ block: b, index, dropCap }: { block: Block; index: number; dropCap: boolean }) {
  const common = { 'data-block': index };
  switch (b.type) {
    case 'scene-break':
      return (
        <p {...common} className="scene-break" role="separator" aria-label="Changement de scène">
          ❦
        </p>
      );
    case 'heading': {
      const H = (`h${b.level + 1}` as 'h2' | 'h3' | 'h4');
      return (
        <H {...common} style={{ textAlign: b.align }}>
          {renderInline(b.children)}
        </H>
      );
    }
    case 'quote':
      return <blockquote {...common}>{renderInline(b.children)}</blockquote>;
    case 'list': {
      const L = b.ordered ? 'ol' : 'ul';
      return (
        <L {...common}>
          {b.items.map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </L>
      );
    }
    default:
      return (
        <p
          {...common}
          data-align={b.align}
          style={b.align !== 'left' ? { textAlign: b.align } : undefined}
          className={dropCap ? 'drop-cap no-indent' : undefined}
        >
          {renderInline(b.children)}
        </p>
      );
  }
}
