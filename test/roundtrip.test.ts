import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/core/parse';
import { serializeDoc } from '../src/core/serialize';

const norm = (s: string) => s.replace(/\r\n?/g, '\n').trim();
export function assertRoundtrip(md: string) {
  expect(norm(serializeDoc(parseMarkdown(md)))).toBe(norm(md));
}

describe('roundtrip basic', () => {
  for (const md of ['# Title', '## Sub', 'hello world', 'a\n\n---\n\nb', 'para with **bold** and [l](http://x)']) {
    it(`md → Doc → md: ${md}`, () => assertRoundtrip(md));
  }
});

describe('roundtrip lists', () => {
  const cases = [
    '- a\n- b',
    '1. one\n2. two',
    '- top\n  - nested\n  - nested2',
    '- [ ] todo\n- [x] done',
  ];
  for (const md of cases) {
    it(`md → Doc → md: ${md}`, () => assertRoundtrip(md));
  }
});

describe('roundtrip quote', () => {
  for (const md of ['> a line', '> line one\n> line two']) {
    it(`md → Doc → md: ${md}`, () => assertRoundtrip(md));
  }
});

describe('roundtrip code + image', () => {
  for (const md of ['```js\nconst a = 1;\n```', '```\nplain\n```', '![alt](http://img/a.png)']) {
    it(md, () => assertRoundtrip(md));
  }
});

describe('roundtrip table', () => {
  const md = '| A | B |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |';
  it('2x2', () => assertRoundtrip(md));
});
