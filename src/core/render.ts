import type { Doc, Block, Inline, List, Run } from './model';
import type { FigmaLike, FrameLike, TextLike, FontName, Paint } from './figma-like';
import { setBlockTag, setCellTag } from './tag';
import { flattenInlines } from './inline';

export type RGB = { r: number; g: number; b: number };

export interface Palette {
  pageBg: RGB;
  text: RGB;
  link: RGB;
  line: RGB;
  codeBg: RGB;
  quoteBg: RGB;
  quoteText: RGB;
  headerBg: RGB;
  cellBg: RGB;
}

const LIGHT: Palette = {
  pageBg: { r: 1, g: 1, b: 1 },
  text: { r: 0, g: 0, b: 0 },
  link: { r: 0, g: 0.478, b: 1 },
  line: { r: 0.82, g: 0.82, b: 0.86 },
  codeBg: { r: 0.949, g: 0.949, b: 0.969 },
  quoteBg: { r: 0.949, g: 0.949, b: 0.969 },
  quoteText: { r: 0.42, g: 0.42, b: 0.45 },
  headerBg: { r: 0.949, g: 0.949, b: 0.969 },
  cellBg: { r: 1, g: 1, b: 1 },
};

const DARK: Palette = {
  pageBg: { r: 0.109, g: 0.109, b: 0.118 },
  text: { r: 1, g: 1, b: 1 },
  link: { r: 0.039, g: 0.518, b: 1 },
  line: { r: 0.219, g: 0.219, b: 0.227 },
  codeBg: { r: 0.172, g: 0.172, b: 0.180 },
  quoteBg: { r: 0.172, g: 0.172, b: 0.180 },
  quoteText: { r: 0.70, g: 0.70, b: 0.72 },
  headerBg: { r: 0.172, g: 0.172, b: 0.180 },
  cellBg: { r: 0.109, g: 0.109, b: 0.118 },
};

const solid = (c: RGB): Paint[] => [{ type: 'SOLID', color: c }];

const REGULAR: FontName = { family: 'Inter', style: 'Regular' };
const BOLD: FontName = { family: 'Inter', style: 'Bold' };
const MONO: FontName = { family: 'Roboto Mono', style: 'Regular' };
const HEADING_SIZE = { 1: 32, 2: 24, 3: 19 } as const;

const PAGE_WIDTH = 720;

function fillWidth(n: FrameLike | TextLike): void {
  n.layoutSizingHorizontal = 'FILL';
}

export async function renderDoc(
  doc: Doc,
  figma: FigmaLike,
  opts?: { theme?: 'light' | 'dark'; override?: { bg?: RGB; fg?: RGB } }
): Promise<FrameLike> {
  await figma.loadFontAsync(REGULAR);
  await figma.loadFontAsync(BOLD);
  await figma.loadFontAsync(MONO);
  await figma.loadFontAsync({ family: 'Inter', style: 'Italic' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold Italic' });

  const pal = opts?.theme === 'dark' ? DARK : LIGHT;
  const text = opts?.override?.fg ?? pal.text;
  const link = pal.link;
  const pageBg = opts?.override?.bg ?? pal.pageBg;

  const page = figma.createFrame();
  page.name = 'Fig.md Page';
  page.layoutMode = 'VERTICAL';
  page.itemSpacing = 12;
  page.paddingTop = page.paddingBottom = page.paddingLeft = page.paddingRight = 24;
  page.counterAxisSizingMode = 'FIXED';
  page.primaryAxisSizingMode = 'AUTO';
  page.resize(PAGE_WIDTH, page.height);
  page.fills = solid(pageBg);
  setBlockTag(page, 'page', { version: '1' });
  for (const b of doc.blocks) {
    const node = renderBlock(b, figma, pal, text, link);
    page.appendChild(node);
    fillWidth(node);
  }
  return page;
}

function applyRuns(t: TextLike, runs: Run[], text: RGB, link: RGB, offset = 0): void {
  let pos = offset;
  for (const r of runs) {
    const start = pos, end = pos + r.text.length;
    if (end > start) {
      const style = r.bold ? (r.italic ? 'Bold Italic' : 'Bold') : (r.italic ? 'Italic' : 'Regular');
      t.setRangeFontName(start, end, r.code ? { family: 'Roboto Mono', style: 'Regular' } : { family: 'Inter', style });
      t.setRangeFills(start, end, solid(r.href ? link : text));
      t.setRangeHyperlink(start, end, r.href ? { type: 'URL', value: r.href } : null);
    }
    pos = end;
  }
}

function textFromInlines(figma: FigmaLike, inlines: Inline[], text: RGB, link: RGB): TextLike {
  const t = figma.createText();
  const runs = flattenInlines(inlines);
  t.fontName = REGULAR;
  t.characters = runs.map(r => r.text).join('');
  t.textAutoResize = 'HEIGHT';
  t.fills = solid(text);
  applyRuns(t, runs, text, link);
  return t;
}

function renderBlock(b: Block, figma: FigmaLike, pal: Palette, text: RGB, link: RGB): FrameLike | TextLike {
  switch (b.type) {
    case 'heading': {
      const t = textFromInlines(figma, b.inlines, text, link);
      t.fontName = BOLD; t.fontSize = HEADING_SIZE[b.level];
      setBlockTag(t, 'heading', { level: b.level });
      return t;
    }
    case 'paragraph': {
      const t = textFromInlines(figma, b.inlines, text, link);
      setBlockTag(t, 'paragraph', {});
      return t;
    }
    case 'divider': {
      const f = figma.createFrame(); f.name = 'divider';
      f.fills = solid(pal.line);
      f.resize(100, 1);
      setBlockTag(f, 'divider', {});
      return f;
    }
    case 'code': {
      const f = figma.createFrame(); f.name = 'code';
      f.layoutMode = 'VERTICAL'; f.primaryAxisSizingMode = 'AUTO';
      f.paddingTop = f.paddingBottom = 12; f.paddingLeft = f.paddingRight = 12;
      f.fills = solid(pal.codeBg);
      const t = figma.createText(); t.fontName = MONO; t.characters = b.value; t.fontSize = 13;
      t.textAutoResize = 'HEIGHT';
      t.fills = solid(text);
      f.appendChild(t); fillWidth(t);
      setBlockTag(f, 'code', { lang: b.lang });
      return f;
    }
    case 'image': {
      const f = figma.createFrame(); f.name = `image: ${b.alt || b.src}`;
      setBlockTag(f, 'image', { src: b.src, alt: b.alt });
      return f;
    }
    case 'quote': {
      // 낮은 위계의 노트/콜아웃: 팔레트 배경 + 여백 + 둥근 모서리, 텍스트는 톤다운된 색으로
      const f = figma.createFrame(); f.name = 'quote'; f.layoutMode = 'VERTICAL'; f.itemSpacing = 4;
      f.primaryAxisSizingMode = 'AUTO';
      f.fills = solid(pal.quoteBg);
      f.cornerRadius = 6;
      f.paddingTop = f.paddingBottom = 12; f.paddingLeft = 16; f.paddingRight = 12;
      setBlockTag(f, 'quote', {});
      b.children.forEach(c => {
        const cn = renderBlock(c, figma, pal, pal.quoteText, link);
        f.appendChild(cn);
        fillWidth(cn);
      });
      return f;
    }
    case 'list': return renderList(b, figma, pal, text, link);
    case 'table': return renderTable(b, figma, pal, text, link);
  }
}

function renderTable(b: import('./model').Table, figma: FigmaLike, pal: Palette, text: RGB, link: RGB): FrameLike {
  const grid = figma.createFrame(); grid.layoutMode = 'VERTICAL'; grid.itemSpacing = 1;
  grid.primaryAxisSizingMode = 'AUTO'; grid.fills = solid(pal.line);
  const allRows = [b.header, ...b.rows];
  setBlockTag(grid, 'table', { rows: allRows.length, cols: b.header.length });
  allRows.forEach((row, r) => {
    const rowFrame = figma.createFrame(); rowFrame.layoutMode = 'HORIZONTAL'; rowFrame.itemSpacing = 1;
    rowFrame.counterAxisSizingMode = 'AUTO'; rowFrame.fills = solid(pal.line);
    rowFrame.name = `row ${r}`;
    row.forEach((cell, c) => {
      const cellFrame = figma.createFrame();
      cellFrame.layoutMode = 'VERTICAL';
      cellFrame.primaryAxisSizingMode = 'AUTO';
      cellFrame.paddingTop = cellFrame.paddingBottom = 6;
      cellFrame.paddingLeft = cellFrame.paddingRight = 10;
      cellFrame.fills = solid(r === 0 ? pal.headerBg : pal.cellBg);
      const t = figma.createText();
      t.fontName = r === 0 ? { family: 'Inter', style: 'Bold' } : REGULAR;
      t.characters = cell;
      t.textAutoResize = 'HEIGHT';
      t.fills = solid(text);
      cellFrame.appendChild(t);
      fillWidth(t);
      setCellTag(cellFrame, r, c);
      rowFrame.appendChild(cellFrame);
      fillWidth(cellFrame);
      cellFrame.layoutSizingVertical = 'FILL';
    });
    grid.appendChild(rowFrame);
    fillWidth(rowFrame);
  });
  return grid;
}

function renderList(list: List, figma: FigmaLike, pal: Palette, text: RGB, link: RGB): FrameLike {
  const f = figma.createFrame(); f.layoutMode = 'VERTICAL'; f.itemSpacing = 4;
  f.primaryAxisSizingMode = 'AUTO'; f.fills = [];
  setBlockTag(f, 'list', { ordered: list.ordered });
  list.items.forEach((it, idx) => {
    const t = figma.createText();
    const marker = list.ordered ? `${idx + 1}.` : '•';
    const box = it.checked === null ? '' : it.checked ? '[x] ' : '[ ] ';
    const prefix = `${marker} ${box}`;
    const contentRuns = flattenInlines(it.inlines);
    t.fontName = REGULAR;
    t.characters = prefix + contentRuns.map(r => r.text).join('');
    t.textAutoResize = 'HEIGHT';
    t.fills = solid(text);
    applyRuns(t, contentRuns, text, link, prefix.length);
    setBlockTag(t, 'list-item', { ordered: list.ordered, index: idx, checked: it.checked });
    f.appendChild(t);
    fillWidth(t);
    it.children.forEach(child => {
      const sub = renderList(child, figma, pal, text, link);
      f.appendChild(sub);
      fillWidth(sub);
    });
  });
  return f;
}
