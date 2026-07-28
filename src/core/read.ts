import type { Doc, Block, Inline, List, ListItem, Run } from './model';
import type { FrameLike, SceneLike, TextLike } from './figma-like';
import { getBlockTag, getCellTag } from './tag';
import { runsToInlines, serializeInlines } from './inline';
import { MIXED } from './figma-like';

export function readDoc(page: FrameLike): { doc: Doc; warnings: string[] } {
  const warnings: string[] = [];
  const blocks: Block[] = [];
  for (const child of page.children) {
    const b = readBlock(child, warnings);
    if (b) blocks.push(b);
  }
  return { doc: { blocks }, warnings };
}

function readInlines(t: TextLike, start: number, end: number, baselineBold = false): Inline[] {
  if (end <= start) return [];
  const s = t.characters;
  const runs: Run[] = [];
  let runStart = start;
  const styleAt = (i: number) => {
    const font = t.getRangeFontName(i, i + 1);
    const link = t.getRangeHyperlink(i, i + 1);
    const fam = (font as any).family as string;
    const sty = (font as any).style as string;
    const href = link && link !== MIXED ? (link as any).value as string : null;
    return {
      code: fam === 'Roboto Mono',
      bold: /Bold/.test(sty),
      italic: /Italic/.test(sty),
      href,
    };
  };
  let cur = styleAt(start);
  for (let i = start + 1; i <= end; i++) {
    const next = i < end ? styleAt(i) : null;
    const changed = !next || next.code !== cur.code || next.bold !== cur.bold || next.italic !== cur.italic || next.href !== cur.href;
    if (changed) {
      runs.push({ text: s.slice(runStart, i), ...cur });
      runStart = i; if (next) cur = next;
    }
  }
  if (baselineBold) for (const r of runs) r.bold = false;
  return runsToInlines(runs);
}

function readBlock(node: SceneLike, warnings: string[]): Block | null {
  const tag = getBlockTag(node);
  if (!tag) { warnings.push(`꼬리표 없는 노드 무시: "${node.name || node.type}"`); return null; }
  const t = node as TextLike; const f = node as FrameLike;
  switch (tag.type) {
    case 'heading': return { type: 'heading', level: tag.meta.level, inlines: readInlines(t, 0, t.characters.length, true) };
    case 'paragraph': return { type: 'paragraph', inlines: readInlines(t, 0, t.characters.length) };
    case 'divider': return { type: 'divider' };
    case 'code': {
      const inner = (node as FrameLike).children[0] as TextLike | undefined;
      return { type: 'code', lang: tag.meta.lang ?? '', value: inner ? inner.characters : '' };
    }
    case 'image': return { type: 'image', src: tag.meta.src ?? '', alt: tag.meta.alt ?? '' };
    case 'quote': {
      const children = f.children.map(c => readBlock(c, warnings)).filter((x): x is Block => !!x);
      return { type: 'quote', children };
    }
    case 'list': return readList(f, warnings);
    case 'table': return readTable(f);
    default: warnings.push(`알 수 없는 블록 타입 무시: ${tag.type}`); return null;
  }
}

function readTable(grid: FrameLike): import('./model').Table {
  const meta = getBlockTag(grid)!.meta;
  const cols: number = meta.cols;
  const cells: string[][] = [];
  for (const rowFrame of grid.children) {
    const row: string[] = [];
    for (const cell of (rowFrame as FrameLike).children) {
      const ct = getCellTag(cell);
      if (ct) {
        const tn = (cell as FrameLike).children[0] as TextLike | undefined;
        const isHeader = ct.r === 0;
        row[ct.c] = tn ? serializeInlines(readInlines(tn, 0, tn.characters.length, isHeader)) : '';
      }
    }
    for (let c = 0; c < cols; c++) if (row[c] === undefined) row[c] = '';
    cells.push(row);
  }
  const header = cells[0] ?? [];
  const rows = cells.slice(1);
  return { type: 'table', header, rows };
}

function readList(frame: FrameLike, warnings: string[]): List {
  const ordered = !!getBlockTag(frame)?.meta.ordered;
  const items: ListItem[] = [];
  for (const child of frame.children) {
    const tag = getBlockTag(child);
    if (tag?.type === 'list-item') {
      const meta = tag.meta;
      const marker = meta.ordered ? `${meta.index + 1}.` : '•';
      const box = meta.checked === null ? '' : meta.checked ? '[x] ' : '[ ] ';
      const prefix = `${marker} ${box}`;
      const tnode = child as TextLike;
      const inlines = readInlines(tnode, prefix.length, tnode.characters.length);
      items.push({ inlines, checked: meta.checked, children: [] });
    } else if (tag?.type === 'list') {
      const sub = readList(child as FrameLike, warnings);
      if (items.length) items[items.length - 1].children.push(sub);
    }
  }
  return { type: 'list', ordered, items };
}
