import { describe, it, expect } from 'vitest';
import { flattenInlines, runsToInlines, parseInlines, serializeInlines } from '../src/core/inline';
import type { Inline } from '../src/core/model';

describe('inline escape (backslash)', () => {
  it('\\* 는 리터럴 * 로 파싱(강조/불릿 아님)', () => {
    expect(parseInlines('\\* item')).toEqual([{ type: 'text', value: '* item' }]);
  });
  it('사용자 케이스: \\* 검색 왕복 보존', () => {
    expect(serializeInlines(parseInlines('\\* 검색'))).toBe('\\* 검색');
  });
  it('리터럴 특수문자는 직렬화 시 이스케이프', () => {
    expect(serializeInlines([{ type: 'text', value: '*a`b[c' }])).toBe('\\*a\\`b\\[c');
  });
  it('이스케이프 문자 왕복', () => {
    for (const md of ['\\*', '\\`', '\\[', '\\\\', 'a \\* b \\` c', '\\* 검색: value']) {
      expect(serializeInlines(parseInlines(md))).toBe(md);
    }
  });
  it('진짜 강조는 여전히 파싱', () => {
    expect(parseInlines('**b**')).toEqual([{ type: 'strong', children: [{ type: 'text', value: 'b' }] }]);
    expect(serializeInlines(parseInlines('**b** and *i*'))).toBe('**b** and *i*');
  });
});

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
