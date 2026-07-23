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
  setBlockTag(page, 'page', { version: '1' });
  for (const b of doc.blocks) page.appendChild(renderBlock(b, figma));
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
      setBlockTag(f, 'divider', {});
      return f;
    }
    case 'code': {
      const t = figma.createText(); t.fontName = MONO; t.characters = b.value; t.fontSize = 13;
      setBlockTag(t, 'code', { lang: b.lang });
      return t;
    }
    case 'image': {
      const f = figma.createFrame(); f.name = `image: ${b.alt || b.src}`;
      setBlockTag(f, 'image', { src: b.src, alt: b.alt });
      return f;
    }
    case 'quote': {
      const f = figma.createFrame(); f.layoutMode = 'VERTICAL'; f.itemSpacing = 4;
      setBlockTag(f, 'quote', {});
      b.children.forEach(c => f.appendChild(renderBlock(c, figma)));
      return f;
    }
    case 'list': return renderList(b, figma);
    case 'table': return renderTable(b, figma);
  }
}

function renderTable(b: import('./model').Table, figma: FigmaLike): FrameLike {
  const grid = figma.createFrame(); grid.layoutMode = 'VERTICAL'; grid.itemSpacing = 1;
  const allRows = [b.header, ...b.rows];
  setBlockTag(grid, 'table', { rows: allRows.length, cols: b.header.length });
  allRows.forEach((row, r) => {
    const rowFrame = figma.createFrame(); rowFrame.layoutMode = 'HORIZONTAL'; rowFrame.itemSpacing = 1;
    rowFrame.name = `row ${r}`;
    row.forEach((cell, c) => {
      const t = figma.createText();
      t.fontName = r === 0 ? { family: 'Inter', style: 'Bold' } : REGULAR;
      t.characters = cell;
      setCellTag(t, r, c);
      rowFrame.appendChild(t);
    });
    grid.appendChild(rowFrame);
  });
  return grid;
}

function renderList(list: List, figma: FigmaLike): FrameLike {
  const f = figma.createFrame(); f.layoutMode = 'VERTICAL'; f.itemSpacing = 4;
  setBlockTag(f, 'list', { ordered: list.ordered });
  list.items.forEach((it, idx) => {
    const t = figma.createText();
    const marker = list.ordered ? `${idx + 1}.` : '•';
    const box = it.checked === null ? '' : it.checked ? '[x] ' : '[ ] ';
    const prefix = `${marker} ${box}`;
    const contentRuns = flattenInlines(it.inlines);
    t.fontName = REGULAR;
    t.characters = prefix + contentRuns.map(r => r.text).join('');
    applyRuns(t, contentRuns, prefix.length);
    setBlockTag(t, 'list-item', { ordered: list.ordered, index: idx, checked: it.checked });
    f.appendChild(t);
    it.children.forEach(child => f.appendChild(renderList(child, figma)));
  });
  return f;
}
