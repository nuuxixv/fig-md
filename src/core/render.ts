import type { Doc, Block, Inline, List, Run } from './model';
import type { FigmaLike, FrameLike, TextLike, FontName, Paint } from './figma-like';
import { setBlockTag, setCellTag } from './tag';
import { flattenInlines } from './inline';
import { themeFromBackground } from './theme';

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

// 문자수 기반 폭 추정 — CJK/한글 등 넓은 글리프는 가중치를 더 준다.
// 픽셀 단위 실측(폰트 메트릭) 대신 문자수 기반으로 계산해 테스트 가능하고 안정적으로 만든다.
function charWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += ch.charCodeAt(0) > 0x1100 ? 13 : 7; // CJK/wide ~13px, latin ~7px
  return w;
}

const COL_PAD = 24;
const COL_MIN = 52;
const COL_MAX = 360;

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

  // 색상 직접 지정(override) 배경이 있으면 그 밝기로 전체 팔레트를 정한다.
  // (그래야 표·인용·코드 배경까지 오버라이드한 색과 같은 명암으로 일관되게 나온다.
  //  없으면 페이지 배경으로 판정한 opts.theme를 따른다.)
  const pageTheme = opts?.theme === 'dark' ? 'dark' : 'light';
  const effTheme = opts?.override?.bg ? themeFromBackground(opts.override.bg) : pageTheme;
  const pal = effTheme === 'dark' ? DARK : LIGHT;
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

function applyRuns(t: TextLike, runs: Run[], text: RGB, link: RGB, offset = 0, boldBase = false): void {
  let pos = offset;
  for (const r of runs) {
    const start = pos, end = pos + r.text.length;
    if (end > start) {
      const bold = r.bold || boldBase;
      const style = bold ? (r.italic ? 'Bold Italic' : 'Bold') : (r.italic ? 'Italic' : 'Regular');
      t.setRangeFontName(start, end, r.code ? { family: 'Roboto Mono', style: 'Regular' } : { family: 'Inter', style });
      t.setRangeFills(start, end, solid(r.href ? link : text));
      t.setRangeHyperlink(start, end, r.href ? { type: 'URL', value: r.href } : null);
    }
    pos = end;
  }
}

// 균일 색 텍스트를 실제 Figma에서 확실히 칠한다.
// 노드 레벨 fills + 범위 API(setRangeFontName→setRangeFills)를 함께 적용.
// (범위에 setRangeFontName을 먼저 걸지 않으면 setRangeFills가 무시되고 기본색(검정)이 남는 실제 Figma 동작 대응.)
// 호출 전에 t.characters가 설정돼 있어야 한다.
function paintUniform(t: TextLike, font: FontName, color: RGB): void {
  t.fontName = font;
  t.fills = solid(color);
  const n = t.characters.length;
  if (n > 0) {
    t.setRangeFontName(0, n, font);
    t.setRangeFills(0, n, solid(color));
  }
}

function textFromInlines(figma: FigmaLike, inlines: Inline[], text: RGB, link: RGB, boldBase = false): TextLike {
  const t = figma.createText();
  const runs = flattenInlines(inlines);
  t.fontName = boldBase ? BOLD : REGULAR;
  t.characters = runs.map(r => r.text).join('');
  t.textAutoResize = 'HEIGHT';
  t.fills = solid(text);
  applyRuns(t, runs, text, link, 0, boldBase);
  return t;
}

function renderBlock(b: Block, figma: FigmaLike, pal: Palette, text: RGB, link: RGB): FrameLike | TextLike {
  switch (b.type) {
    case 'heading': {
      const t = textFromInlines(figma, b.inlines, text, link, true);
      t.fontSize = HEADING_SIZE[b.level];
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
      const t = figma.createText(); t.characters = b.value; t.fontSize = 13;
      t.textAutoResize = 'HEIGHT';
      paintUniform(t, MONO, text);
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
  const cols = b.header.length;
  setBlockTag(grid, 'table', { rows: allRows.length, cols });
  const cellFrames: FrameLike[][] = [];
  allRows.forEach((row, r) => {
    const rowFrame = figma.createFrame(); rowFrame.layoutMode = 'HORIZONTAL'; rowFrame.itemSpacing = 1;
    rowFrame.counterAxisSizingMode = 'AUTO'; rowFrame.fills = solid(pal.line);
    rowFrame.name = `row ${r}`;
    const rowCellFrames: FrameLike[] = [];
    row.forEach((cell, c) => {
      const cellFrame = figma.createFrame();
      cellFrame.layoutMode = 'VERTICAL';
      cellFrame.primaryAxisSizingMode = 'AUTO';
      cellFrame.paddingTop = cellFrame.paddingBottom = 6;
      cellFrame.paddingLeft = cellFrame.paddingRight = 10;
      cellFrame.fills = solid(r === 0 ? pal.headerBg : pal.cellBg);
      const t = figma.createText();
      t.characters = cell;
      t.textAutoResize = 'HEIGHT';
      paintUniform(t, r === 0 ? { family: 'Inter', style: 'Bold' } : REGULAR, text);
      cellFrame.appendChild(t);
      fillWidth(t);
      setCellTag(cellFrame, r, c);
      rowFrame.appendChild(cellFrame);
      cellFrame.layoutSizingVertical = 'FILL';
      rowCellFrames.push(cellFrame);
    });
    cellFrames.push(rowCellFrames);
    grid.appendChild(rowFrame);
    fillWidth(rowFrame);
  });

  // 열 폭: 마지막 열은 남은 공간을 채우고(FILL), 그 외 열은 내용(글자수) 기반 고정폭.
  // 같은 열의 모든 셀에 동일한 폭을 적용해 행 간 정렬을 맞춘다.
  for (let c = 0; c < cols; c++) {
    if (c === cols - 1) {
      for (const rowCellFrames of cellFrames) fillWidth(rowCellFrames[c]);
      continue;
    }
    const maxChar = Math.max(...allRows.map(row => charWidth(row[c] ?? '')));
    const wCol = Math.min(Math.max(COL_PAD + maxChar, COL_MIN), COL_MAX);
    for (const rowCellFrames of cellFrames) {
      const cellFrame = rowCellFrames[c];
      cellFrame.layoutSizingHorizontal = 'FIXED';
      cellFrame.resize(wCol, cellFrame.height);
    }
  }

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
    t.characters = prefix + contentRuns.map(r => r.text).join('');
    t.textAutoResize = 'HEIGHT';
    t.fontName = REGULAR;
    t.fills = solid(text);
    if (prefix.length > 0) {
      t.setRangeFontName(0, prefix.length, REGULAR);
      t.setRangeFills(0, prefix.length, solid(text));
    }
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
