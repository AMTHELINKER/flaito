import { describe, expect, it } from 'vitest';
import { centerEdit, linePrefixEdit, sceneBreakEdit, wrapEdit } from './textareaTools';

const apply = (v: string, e: { start: number; end: number; text: string }) => v.slice(0, e.start) + e.text + v.slice(e.end);

describe('textareaTools', () => {
  it('met en gras et bascule', () => {
    const v = 'un mot ici';
    const e = wrapEdit(v, 3, 6, '**');
    const out = apply(v, e);
    expect(out).toBe('un **mot** ici');
    expect(apply(out, wrapEdit(out, e.selStart, e.selEnd, '**'))).toBe(v);
  });
  it('ajoute et retire un préfixe de ligne', () => {
    const v = 'a\nb';
    const out = apply(v, linePrefixEdit(v, 0, 3, '> ', /^>\s?/));
    expect(out).toBe('> a\n> b');
    expect(apply(out, linePrefixEdit(out, 0, out.length, '> ', /^>\s?/))).toBe('a\nb');
  });
  it('centre une ligne', () => {
    expect(apply('titre', centerEdit('titre', 0, 0))).toBe('-> titre <-');
  });
  it('insère un séparateur de scène', () => {
    expect(apply('fin', sceneBreakEdit('fin', 3))).toBe('fin\n\n* * *\n\n');
  });
});
