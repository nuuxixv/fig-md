import type { Doc, Block, Inline, List, Run } from './model';
import type { FigmaLike, FrameLike, TextLike, FontName, Paint } from './figma-like';
import { setBlockTag, setCellTag } from './tag';
import { flattenInlines } from './inline';

const REGULAR: FontName = { family: 'Inter', style: 'Regular' };
const BOLD: FontName = { family: 'Inter', style: 'Bold' };
const MONO: FontName = { family: 'Roboto Mono', style: 'Regular' };
const HEADING_SIZE = { 1: 32, 2: 24, 3: 19 } as const;
const BLUE: Paint[] = [{ type: 'SOLID', color: { r: 0.1, g: 0.4, b: 0.9 } }];
const BLACK: Paint[] = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];

const PAGE_WIDTH = 720;
const LINE: Paint[] = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
const WHITE: Paint[] = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
const HEADER_BG: Paint[] = [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96 } }];
const CODE_BG: Paint[] = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
const QUOTE_BG: Paint[] = [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96 } }];
const GRAY_TEXT: Paint[] = [{ type: 'SOLID', color: { r: 0.42, g: 0.42, b: 0.42 } }];

function fillWidth(n: FrameLike | TextLike): void {
  n.layoutSizingHorizontal = 'FILL';
}

export async function renderDoc(doc: Doc, figma: FigmaLike): Promise<FrameLike> {
  await figma.loadFontAsync(REGULAR);
  await figma.loadFontAsync(BOLD);
  await figma.loadFontAsync(MONO);
  await figma.loadFontAsync({ family: 'Inter', style: 'Italic' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold Italic' });
  const page = figma.createFrame();
  page.name = 'Fig.md Page';
  page.layoutMode = 'VERTICAL';
  page.itemSpacing = 12;
  page.paddingTop = page.paddingBottom = page.paddingLeft = page.paddingRight = 24;
  page.counterAxisSizingMode = 'FIXED';
  page.primaryAxisSizingMode = 'AUTO';
  page.resize(PAGE_WIDTH, page.height);
  setBlockTag(page, 'page', { version: '1' });
  for (const b of doc.blocks) {
    const node = renderBlock(b, figma);
    page.appendChild(node);
    fillWidth(node);
  }
  return page;
}

function applyRuns(t: TextLike, runs: Run[], offset = 0): void {
  let pos = offset;
  for (const r of runs) {
    const start = pos, end = pos + r.text.length;
    if (end > start) {
      const style = r.bold ? (r.italic ? 'Bold Italic' : 'Bold') : (r.italic ? 'Italic' : 'Regular');
      t.setRangeFontName(start, end, r.code ? { family: 'Roboto Mono', style: 'Regular' } : { family: 'Inter', style });
      t.setRangeFills(start, end, r.href ? BLUE : BLACK);
      t.setRangeHyperlink(start, end, r.href ? { type: 'URL', value: r.href } : null);
    }
    pos = end;
  }
}

function textFromInlines(figma: FigmaLike, inlines: Inline[]): TextLike {
  const t = figma.createText();
  const runs = flattenInlines(inlines);
  t.fontName = REGULAR;
  t.characters = runs.map(r => r.text).join('');
  t.textAutoResize = 'HEIGHT';
  applyRuns(t, runs);
  return t;
}

function renderBlock(b: Block, figma: FigmaLike): FrameLike | TextLike {
  switch (b.type) {
    case 'heading': {
      const t = textFromInlines(figma, b.inlines);
      t.fontName = BOLD; t.fontSize = HEADING_SIZE[b.level];
      setBlockTag(t, 'heading', { level: b.level });
      return t;
    }
    case 'paragraph': {
      const t = textFromInlines(figma, b.inlines);
      setBlockTag(t, 'paragraph', {});
      return t;
    }
    case 'divider': {
      const f = figma.createFrame(); f.name = 'divider';
      f.fills = LINE;
      f.resize(100, 1);
      setBlockTag(f, 'divider', {});
      return f;
    }
    case 'code': {
      const f = figma.createFrame(); f.name = 'code';
      f.layoutMode = 'VERTICAL'; f.primaryAxisSizingMode = 'AUTO';
      f.paddingTop = f.paddingBottom = 12; f.paddingLeft = f.paddingRight = 12;
      f.fills = CODE_BG;
      const t = figma.createText(); t.fontName = MONO; t.characters = b.value; t.fontSize = 13;
      t.textAutoResize = 'HEIGHT';
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
      // 낮은 위계의 노트/콜아웃: 회색 배경 + 여백 + 둥근 모서리, 텍스트는 회색으로 톤다운
      const f = figma.createFrame(); f.name = 'quote'; f.layoutMode = 'VERTICAL'; f.itemSpacing = 4;
      f.primaryAxisSizingMode = 'AUTO';
      f.fills = QUOTE_BG;
      f.cornerRadius = 6;
      f.paddingTop = f.paddingBottom = 12; f.paddingLeft = 16; f.paddingRight = 12;
      setBlockTag(f, 'quote', {});
      b.children.forEach(c => {
        const cn = renderBlock(c, figma);
        f.appendChild(cn);
        fillWidth(cn);
        if (cn.type === 'TEXT' && cn.characters.length > 0) {
          cn.setRangeFills(0, cn.characters.length, GRAY_TEXT);
        }
      });
      return f;
    }
    case 'list': return renderList(b, figma);
    case 'table': return renderTable(b, figma);
  }
}

function renderTable(b: import('./model').Table, figma: FigmaLike): FrameLike {
  const grid = figma.createFrame(); grid.layoutMode = 'VERTICAL'; grid.itemSpacing = 1;
  grid.primaryAxisSizingMode = 'AUTO'; grid.fills = LINE;
  const allRows = [b.header, ...b.rows];
  setBlockTag(grid, 'table', { rows: allRows.length, cols: b.header.length });
  allRows.forEach((row, r) => {
    const rowFrame = figma.createFrame(); rowFrame.layoutMode = 'HORIZONTAL'; rowFrame.itemSpacing = 1;
    rowFrame.counterAxisSizingMode = 'AUTO'; rowFrame.fills = LINE;
    rowFrame.name = `row ${r}`;
    row.forEach((cell, c) => {
      const cellFrame = figma.createFrame();
      cellFrame.layoutMode = 'VERTICAL';
      cellFrame.primaryAxisSizingMode = 'AUTO';
      cellFrame.paddingTop = cellFrame.paddingBottom = 6;
      cellFrame.paddingLeft = cellFrame.paddingRight = 10;
      cellFrame.fills = r === 0 ? HEADER_BG : WHITE;
      const t = figma.createText();
      t.fontName = r === 0 ? { family: 'Inter', style: 'Bold' } : REGULAR;
      t.characters = cell;
      t.textAutoResize = 'HEIGHT';
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

function renderList(list: List, figma: FigmaLike): FrameLike {
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
    applyRuns(t, contentRuns, prefix.length);
    setBlockTag(t, 'list-item', { ordered: list.ordered, index: idx, checked: it.checked });
    f.appendChild(t);
    fillWidth(t);
    it.children.forEach(child => {
      const sub = renderList(child, figma);
      f.appendChild(sub);
      fillWidth(sub);
    });
  });
  return f;
}
