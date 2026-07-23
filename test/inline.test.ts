import { describe, it, expect } from 'vitest';
import { flattenInlines, runsToInlines, parseInlines, serializeInlines } from '../src/core/inline';
import type { Inline } from '../src/core/model';

describe('flatten/runs roundtrip', () => {
  it('plain text', () => {
    const xs: Inline[] = [{ type: 'text', value: 'hello' }];
    const rs = flattenInlines(xs);
    expect(rs).toEqual([{ text: 'hello', bold: false, italic: false, code: false, href: null }]);
    expect(runsToInlines(rs)).toEqual(xs);
  });
  it('bold + link', () => {
    const xs: Inline[] = [
      { type: 'strong', children: [{ type: 'text', value: 'A' }] },
      { type: 'link', href: 'http://x', children: [{ type: 'text', value: 'B' }] },
    ];
    const rs = flattenInlines(xs);
    expect(rs).toEqual([
      { text: 'A', bold: true, italic: false, code: false, href: null },
      { text: 'B', bold: false, italic: false, code: false, href: 'http://x' },
    ]);
    expect(runsToInlines(rs)).toEqual(xs);
  });
});

describe('inline parse/serialize', () => {
  const cases = [
    'plain',
    '**bold**',
    '*italic*',
    'a `code` b',
    '[text](http://x)',
    'mix **b** and *i* and [l](http://y)',
  ];
  for (const md of cases) {
    it(`roundtrip: ${md}`, () => {
      expect(serializeInlines(parseInlines(md))).toBe(md);
    });
  }
  it('parses bold node', () => {
    expect(parseInlines('**b**')).toEqual([{ type: 'strong', children: [{ type: 'text', value: 'b' }] }]);
  });
});
