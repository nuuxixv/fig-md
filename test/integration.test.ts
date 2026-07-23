import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/core/parse';
import { serializeDoc } from '../src/core/serialize';
import { renderDoc } from '../src/core/render';
import { readDoc } from '../src/core/read';
import { FakeFigma } from './fake-figma';

const PRD = [
  '# 샘플 문서',
  '',
  '> 이 문서는 라운드트립 예시임',
  '> 두 번째 인용 줄',
  '',
  '## 1. 개요',
  '',
  '이 문단에는 **굵은** 글자와 [링크](http://example.com)가 있다.',
  '',
  '- 첫 번째 항목',
  '- 두 번째 항목',
  '  - 중첩 항목',
  '',
  '| 열 A | 열 B | 열 C |',
  '| --- | --- | --- |',
  '| 1 | 2 | 3 |',
  '',
  '```ts',
  'const enabled = true;',
  '```',
].join('\n');

const norm = (s: string) => s.replace(/\r\n?/g, '\n').trim();

describe('full pipeline roundtrip (PRD)', () => {
  it('md → render → read → md 의미 보존', async () => {
    const doc = parseMarkdown(PRD);
    const page = await renderDoc(doc, new FakeFigma());
    const { doc: back, warnings } = readDoc(page);
    expect(warnings).toEqual([]);
    expect(norm(serializeDoc(back))).toBe(norm(PRD));
  });

  it('꼬리표 없는 이물질은 무시 + 경고', async () => {
    const doc = parseMarkdown('# A');
    const figma = new FakeFigma();
    const page = await renderDoc(doc, figma);
    const foreign = figma.createFrame(); foreign.name = '직접 그린 사각형';
    page.appendChild(foreign);
    const { warnings } = readDoc(page);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain('직접 그린 사각형');
  });
});
