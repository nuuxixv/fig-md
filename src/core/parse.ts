import type { Doc, Block, List, ListItem } from './model';
import { parseInlines } from './inline';

export function parseMarkdown(md: string): Doc {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }
    if (line.trim() === '---') { blocks.push({ type: 'divider' }); i++; continue; }
    const fence = /^```(.*)$/.exec(line.trim());
    if (fence) {
      const lang = fence[1].trim();
      const body: string[] = []; i++;
      while (i < lines.length && lines[i].trim() !== '```') { body.push(lines[i]); i++; }
      i++; // 닫는 펜스 소비
      blocks.push({ type: 'code', lang, value: body.join('\n') }); continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ type: 'heading', level: h[1].length as 1 | 2 | 3, inlines: parseInlines(h[2].trim()) });
      i++; continue;
    }
    const img = /^!\[([^\]]*)\]\(([^)]*)\)$/.exec(line.trim());
    if (img) { blocks.push({ type: 'image', alt: img[1], src: img[2] }); i++; continue; }
    if (isListItem(line)) {
      const [list, next] = parseList(lines, i, indentOf(line));
      blocks.push(list);
      i = next;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { inner.push(lines[i].replace(/^>\s?/, '')); i++; }
      const children = inner
        .filter(t => t.trim() !== '')
        .map(t => ({ type: 'paragraph' as const, inlines: parseInlines(t.trim()) }));
      blocks.push({ type: 'quote', children }); continue;
    }
    if (isTableStart(lines, i)) {
      const header = splitRow(lines[i]); i += 2; // 헤더 + 구분선 소비
      const rows: string[][] = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim() !== '') { rows.push(splitRow(lines[i])); i++; }
      blocks.push({ type: 'table', header, rows }); continue;
    }
    // paragraph: 연속된 비어있지 않은 "일반" 줄을 공백으로 합침
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
      para.push(lines[i].trim()); i++;
    }
    blocks.push({ type: 'paragraph', inlines: parseInlines(para.join(' ')) });
  }
  return { blocks };
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

function isTableStart(lines: string[], i: number): boolean {
  return /\|/.test(lines[i] ?? '') && /^\s*\|?\s*:?-{1,}/.test(lines[i + 1] ?? '');
}

// 이후 Task들이 여기에 자기 블록 시작 판별을 추가한다(목록/인용/표/코드/이미지).
function isBlockStart(line: string): boolean {
  const t = line.trim();
  return t === '---' || /^#{1,3}\s/.test(line) || isListItem(line) || /^>\s?/.test(line) || t.startsWith('```') || /^!\[[^\]]*\]\([^)]*\)$/.test(t);
}

function isListItem(line: string): boolean {
  return /^(\s*)([-*]|\d+\.)\s+/.test(line);
}

function indentOf(line: string): number {
  const m = /^(\s*)/.exec(line)!;
  return Math.floor(m[1].length / 2);
}

function parseList(lines: string[], start: number, level: number): [List, number] {
  const first = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(lines[start])!;
  const ordered = /\d+\./.test(first[2]);
  const items: ListItem[] = [];
  let i = start;
  while (i < lines.length) {
    const m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(lines[i]);
    if (!m || lines[i].trim() === '') break;
    const lvl = indentOf(lines[i]);
    if (lvl < level) break;
    if (lvl > level) {
      // 하위 목록은 직전 항목의 children으로
      const [child, next] = parseList(lines, i, lvl);
      if (items.length) items[items.length - 1].children.push(child);
      i = next;
      continue;
    }
    let text = m[3];
    let checked: boolean | null = null;
    const cb = /^\[( |x)\]\s+(.*)$/.exec(text);
    if (cb) {
      checked = cb[1] === 'x';
      text = cb[2];
    }
    items.push({ inlines: parseInlines(text), checked, children: [] });
    i++;
  }
  return [{ type: 'list', ordered, items }, i];
}
