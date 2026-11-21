/**
 * SOURCE DE VÉRITÉ : dépôt blaito (src/shared) — copié dans flaito par `pnpm shared:sync`.
 *
 * Format du texte des chapitres.
 *
 * Le cahier des charges impose une zone de texte simple (textarea) et un
 * contenu stocké en texte. La mise en forme riche s'exprime donc avec une
 * syntaxe légère, inspirée de Markdown, que l'éditeur insère via sa barre
 * d'outils et que le lecteur interprète :
 *
 *   **gras**   *italique*   # Titre   ## Sous-titre   > citation
 *   - liste    1. liste numérotée
 *   -> texte centré <-      texte aligné à droite ->
 *   * * *   (séparateur de scène, affiché comme un ornement)
 *
 * Aucun HTML n'est jamais interprété : le rendu produit un arbre de nœuds.
 */

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: Inline[] }
  | { type: 'italic'; children: Inline[] };

export type Align = 'left' | 'center' | 'right';

export type Block =
  | { type: 'paragraph'; align: Align; children: Inline[] }
  | { type: 'heading'; level: 1 | 2 | 3; align: Align; children: Inline[] }
  | { type: 'quote'; children: Inline[] }
  | { type: 'list'; ordered: boolean; items: Inline[][] }
  | { type: 'scene-break' };

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let buf = '';
  let i = 0;
  const flush = () => {
    if (buf) out.push({ type: 'text', text: buf });
    buf = '';
  };
  while (i < src.length) {
    if (src.startsWith('**', i)) {
      const end = src.indexOf('**', i + 2);
      if (end > i + 2) {
        flush();
        out.push({ type: 'bold', children: parseInline(src.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }
    if (src[i] === '*' && src[i + 1] !== '*' && src[i + 1] !== ' ') {
      const end = src.indexOf('*', i + 1);
      if (end > i + 1 && src[end - 1] !== ' ') {
        flush();
        out.push({ type: 'italic', children: parseInline(src.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    buf += src[i];
    i++;
  }
  flush();
  return out;
}

function alignOf(line: string): { align: Align; text: string } {
  const t = line.trim();
  if (t.startsWith('->') && t.endsWith('<-') && t.length >= 4) {
    return { align: 'center', text: t.slice(2, -2).trim() };
  }
  if (t.endsWith('->') && !t.startsWith('->')) {
    return { align: 'right', text: t.slice(0, -2).trim() };
  }
  return { align: 'left', text: line };
}

const SCENE_BREAK = /^\s*(\*\s*){3,}$|^\s*(-\s*){3,}$/;

/** Découpe un texte de chapitre en blocs. Chaque ligne non vide de texte courant est un paragraphe. */
export function parseChapter(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (SCENE_BREAK.test(line)) {
      blocks.push({ type: 'scene-break' });
      i++;
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const { align, text } = alignOf(h[2]);
      blocks.push({
        type: 'heading',
        level: h[1].length as 1 | 2 | 3,
        align,
        children: parseInline(text),
      });
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const parts: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        parts.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', children: parseInline(parts.join(' ')) });
      continue;
    }
    const ul = /^\s*[-•]\s+/;
    const ol = /^\s*\d+[.)]\s+/;
    if (ul.test(line) || ol.test(line)) {
      const ordered = ol.test(line);
      const re = ordered ? ol : ul;
      const items: Inline[][] = [];
      while (i < lines.length && re.test(lines[i])) {
        items.push(parseInline(lines[i].replace(re, '')));
        i++;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }
    const { align, text } = alignOf(line);
    blocks.push({ type: 'paragraph', align, children: parseInline(text) });
    i++;
  }
  return blocks;
}

/** Texte brut (sans marques de mise en forme) — utilisé pour la recherche et le comptage. */
export function toPlainText(src: string): string {
  return src
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) =>
      l
        .replace(/^#{1,3}\s+/, '')
        .replace(/^>\s?/, '')
        .replace(/^\s*[-•]\s+/, '')
        .replace(/^\s*\d+[.)]\s+/, '')
        .replace(/^\s*->\s*|\s*<-\s*$|\s*->\s*$/g, '')
        .replace(/\*\*|\*/g, ''),
    )
    .filter((l) => !SCENE_BREAK.test(l))
    .join('\n')
    .trim();
}

export function countWords(src: string): number {
  const plain = toPlainText(src);
  if (!plain) return 0;
  return plain.split(/[\s\u00a0]+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function readingMinutes(words: number, wpm = 230): number {
  return Math.max(1, Math.round(words / wpm));
}

export function slugify(input: string): string {
  return (
    input
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'livre'
  );
}
