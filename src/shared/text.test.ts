import { describe, expect, it } from 'vitest';
import { countWords, parseChapter, parseInline, slugify, toPlainText } from './text';

describe('parseInline', () => {
  it('parses bold and italic', () => {
    expect(parseInline('a **b** *c*')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'bold', children: [{ type: 'text', text: 'b' }] },
      { type: 'text', text: ' ' },
      { type: 'italic', children: [{ type: 'text', text: 'c' }] },
    ]);
  });
  it('leaves unmatched markers as text', () => {
    expect(parseInline('2 * 3')).toEqual([{ type: 'text', text: '2 * 3' }]);
  });
});

describe('parseChapter', () => {
  it('produces headings, quotes, lists, scene breaks and alignment', () => {
    const blocks = parseChapter(
      '# Titre\n\nIl était une fois.\n> Une citation\n- un\n- deux\n* * *\n-> centré <-\nà droite ->',
    );
    expect(blocks.map((b) => b.type)).toEqual([
      'heading',
      'paragraph',
      'quote',
      'list',
      'scene-break',
      'paragraph',
      'paragraph',
    ]);
    expect(blocks[5]).toMatchObject({ align: 'center' });
    expect(blocks[6]).toMatchObject({ align: 'right' });
  });
  it('never interprets HTML', () => {
    const [b] = parseChapter('<script>alert(1)</script>');
    expect(b).toEqual({
      type: 'paragraph',
      align: 'left',
      children: [{ type: 'text', text: '<script>alert(1)</script>' }],
    });
  });
});

describe('countWords / toPlainText / slugify', () => {
  it('counts words without markup', () => {
    expect(countWords('# Le **grand** jour\n\n* * *\nC’est l’été !')).toBe(5);
    expect(toPlainText('> **Bonjour**')).toBe('Bonjour');
  });
  it('slugifies accents', () => {
    expect(slugify('L’Été à Noël !')).toBe('l-ete-a-noel');
  });
});
