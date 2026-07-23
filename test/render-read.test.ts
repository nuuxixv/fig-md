import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/core/parse';
import { serializeDoc } from '../src/core/serialize';
import { renderDoc } from '../src/core/render';
import { readDoc } from '../src/core/read';
import { FakeFigma } from './fake-figma';

const norm = (s: string) => s.replace(/\r\n?/g, '\n').trim();
async function nodeRoundtrip(md: string) {
  const doc = parseMarkdown(md);
  const page = await renderDoc(doc, new FakeFigma());
  const { doc: back, warnings } = readDoc(page);
  expect(warnings).toEqual([]);
  expect(norm(serializeDoc(back))).toBe(norm(md));
}

describe('render→read roundtrip (no table/inline styling)', () => {
  for (const md of [
    '# Title',
    'plain paragraph',
    '---',
    '- a\n- b\n  - c',
    '1. one\n2. two',
    '- [ ] todo\n- [x] done',
    '> a quote',
    '```js\nconst a = 1;\n```',
    '![alt](http://img/a.png)',
  ]) { it(md, () => nodeRoundtrip(md)); }
});

describe('render→read inline styling', () => {
  for (const md of [
    'para with **bold** word',
    'has *italic* here',
    'link [go](http://x) end',
    'mix **b** and *i* and `c`',
  ]) { it(md, () => nodeRoundtrip(md)); }
});

describe('render→read list item inline styling', () => {
  for (const md of [
    '- go [here](http://x) now',
    '- item with **bold** word',
    '1. see [ref](http://y)',
    '- [ ] task with *em*',
    '- top **b**\n  - nested [l](http://z)',
  ]) { it(md, () => nodeRoundtrip(md)); }
});

describe('render→read heading plain', () => {
  it('# Title stays plain', () => nodeRoundtrip('# Title'));
  it('## has *italic* still works in paragraph, heading stays plain', () => nodeRoundtrip('# Heading\n\nbody with *italic*'));
});

describe('render→read table', () => {
  it('2x2', () => nodeRoundtrip('| A | B |\n| --- | --- |\n| 1 | 2 |'));
});
