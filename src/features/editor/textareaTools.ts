/** Outils de mise en forme pour une zone de texte simple (syntaxe de @laito/shared/text). */

export interface Edit {
  start: number;
  end: number;
  text: string;
  selStart: number;
  selEnd: number;
}

function lineBounds(value: string, start: number, end: number) {
  const ls = value.lastIndexOf('\n', start - 1) + 1;
  let le = value.indexOf('\n', end > start && value[end - 1] === '\n' ? end - 1 : end);
  if (le === -1) le = value.length;
  return { ls, le };
}

export function wrapEdit(value: string, start: number, end: number, marker: string): Edit {
  const sel = value.slice(start, end);
  const before = value.slice(start - marker.length, start);
  const after = value.slice(end, end + marker.length);
  // Bascule : retire le marqueur s'il entoure déjà la sélection.
  if (sel && before === marker && after === marker) {
    return {
      start: start - marker.length,
      end: end + marker.length,
      text: sel,
      selStart: start - marker.length,
      selEnd: end - marker.length,
    };
  }
  const text = `${marker}${sel || 'texte'}${marker}`;
  return {
    start,
    end,
    text,
    selStart: start + marker.length,
    selEnd: start + marker.length + (sel || 'texte').length,
  };
}

export function linePrefixEdit(
  value: string,
  start: number,
  end: number,
  prefix: string,
  re: RegExp,
): Edit {
  const { ls, le } = lineBounds(value, start, end);
  const lines = value.slice(ls, le).split('\n');
  const all = lines.every((l) => !l.trim() || re.test(l));
  const out = lines.map((l) => {
    if (!l.trim()) return l;
    const stripped = l.replace(/^(#{1,3}\s+|>\s?|\s*[-•]\s+|\s*\d+[.)]\s+)/, '');
    return all ? stripped : prefix + stripped;
  });
  const text = out.join('\n');
  return { start: ls, end: le, text, selStart: ls, selEnd: ls + text.length };
}

export function centerEdit(value: string, start: number, end: number): Edit {
  const { ls, le } = lineBounds(value, start, end);
  const lines = value.slice(ls, le).split('\n');
  const isCentered = (l: string) => /^\s*->.*<-\s*$/.test(l);
  const all = lines.every((l) => !l.trim() || isCentered(l));
  const text = lines
    .map((l) => {
      if (!l.trim()) return l;
      const t = l.trim();
      return all ? t.slice(2, -2).trim() : `-> ${t} <-`;
    })
    .join('\n');
  return { start: ls, end: le, text, selStart: ls, selEnd: ls + text.length };
}

export function sceneBreakEdit(value: string, start: number): Edit {
  const pre = start > 0 && value[start - 1] !== '\n' ? '\n\n' : start > 0 ? '\n' : '';
  const text = `${pre}* * *\n\n`;
  return { start, end: start, text, selStart: start + text.length, selEnd: start + text.length };
}

/** Applique une édition en conservant l'historique d'annulation natif quand c'est possible. */
export function applyEdit(ta: HTMLTextAreaElement, e: Edit, onFallback: (value: string) => void) {
  ta.focus();
  ta.setSelectionRange(e.start, e.end);
  let ok = false;
  try {
    ok = document.execCommand?.('insertText', false, e.text) ?? false;
  } catch {
    ok = false;
  }
  if (!ok) {
    const value = ta.value.slice(0, e.start) + e.text + ta.value.slice(e.end);
    onFallback(value);
  }
  requestAnimationFrame(() => ta.setSelectionRange(e.selStart, e.selEnd));
}

/** Coordonnées (relatives à la zone de texte) d'une position du curseur — technique du miroir. */
export function caretCoords(ta: HTMLTextAreaElement, pos: number) {
  const div = document.createElement('div');
  const cs = getComputedStyle(ta);
  const props = [
    'boxSizing',
    'width',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'letterSpacing',
    'lineHeight',
    'textTransform',
    'wordSpacing',
    'textIndent',
    'tabSize',
  ] as const;
  props.forEach((p) => {
    (div.style as unknown as Record<string, string>)[p] = cs[p] as string;
  });
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.overflowWrap = 'break-word';
  div.style.top = '0';
  div.style.left = '-9999px';
  div.textContent = ta.value.slice(0, pos);
  const span = document.createElement('span');
  span.textContent = ta.value.slice(pos) || '.';
  div.appendChild(span);
  document.body.appendChild(div);
  const top = span.offsetTop - ta.scrollTop;
  const left = span.offsetLeft;
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.6;
  document.body.removeChild(div);
  return { top, left, lineHeight: lh };
}
