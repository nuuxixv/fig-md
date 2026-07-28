import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/core/parse';
import { renderDoc } from '../src/core/render';
import { FakeFigma } from './fake-figma';
import type { FrameLike, TextLike } from '../src/core/figma-like';
import { MIXED } from '../src/core/figma-like';

describe('render layout — real-Figma sizing/appearance', () => {
  it('page has a fixed 720 width and vertical auto-layout', async () => {
    const doc = parseMarkdown('# Title\n\nsome paragraph text');
    const page = await renderDoc(doc, new FakeFigma());
    expect(page.width).toBe(720);
    expect(page.counterAxisSizingMode).toBe('FIXED');
    expect(page.layoutMode).toBe('VERTICAL');
  });

  it('every direct child of page fills the page width', async () => {
    const doc = parseMarkdown('# Title\n\nsome paragraph text\n\n---\n\n- a\n- b');
    const page = await renderDoc(doc, new FakeFigma());
    expect(page.children.length).toBeGreaterThan(0);
    for (const child of page.children) {
      expect((child as FrameLike | TextLike).layoutSizingHorizontal).toBe('FILL');
    }
  });

  it('heading and paragraph text blocks auto-resize by height only', async () => {
    const doc = parseMarkdown('# Title\n\nsome paragraph text');
    const page = await renderDoc(doc, new FakeFigma());
    const [heading, paragraph] = page.children as TextLike[];
    expect(heading.textAutoResize).toBe('HEIGHT');
    expect(paragraph.textAutoResize).toBe('HEIGHT');
  });

  it('divider renders as a thin, non-white line', async () => {
    const doc = parseMarkdown('---');
    const page = await renderDoc(doc, new FakeFigma());
    const divider = page.children[0] as FrameLike;
    expect(divider.height).toBeLessThanOrEqual(4);
    const color = divider.fills[0].color;
    expect(color.r === 1 && color.g === 1 && color.b === 1).toBe(false);
  });

  it('table rows fill the available width; last column cell fills, others are fixed-width', async () => {
    const doc = parseMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |');
    const page = await renderDoc(doc, new FakeFigma());
    const grid = page.children[0] as FrameLike;
    expect(grid.children.length).toBeGreaterThan(0);
    for (const rowFrame of grid.children as FrameLike[]) {
      expect(rowFrame.layoutSizingHorizontal).toBe('FILL');
      const cells = rowFrame.children as FrameLike[];
      const lastCell = cells[cells.length - 1];
      expect(lastCell.layoutSizingHorizontal).toBe('FILL');
      for (const cell of cells.slice(0, -1)) {
        expect(cell.layoutSizingHorizontal).toBe('FIXED');
      }
    }
  });

  it('non-last table columns get a content-based fixed width, aligned across rows', async () => {
    const doc = parseMarkdown(
      '| ID | 설명 |\n| --- | --- |\n| 1 | 아주 긴 설명 텍스트 라벨입니다 |'
    );
    const page = await renderDoc(doc, new FakeFigma());
    const grid = page.children[0] as FrameLike;
    const rows = grid.children as FrameLike[];
    const firstColWidths = rows.map(row => (row.children[0] as FrameLike).width);
    // aligned across rows (same width for every row in that column)
    expect(new Set(firstColWidths).size).toBe(1);
    for (const w of firstColWidths) {
      expect(w).toBeGreaterThan(0);
      expect(w).toBeLessThanOrEqual(360);
    }
    // last column (description) fills, not fixed
    for (const row of rows) {
      const lastCell = row.children[row.children.length - 1] as FrameLike;
      expect(lastCell.layoutSizingHorizontal).toBe('FILL');
    }
  });

  it('a column with longer content gets a wider fixed width than a column with short content', async () => {
    const doc = parseMarkdown(
      '| ID | 설명 | 비고 |\n| --- | --- | --- |\n| 1 | 아주 긴 설명 텍스트 라벨입니다 | ok |'
    );
    const page = await renderDoc(doc, new FakeFigma());
    const grid = page.children[0] as FrameLike;
    const headerRow = grid.children[0] as FrameLike;
    const idColWidth = (headerRow.children[0] as FrameLike).width;
    const descColWidth = (headerRow.children[1] as FrameLike).width;
    expect(headerRow.children[0] && (headerRow.children[0] as FrameLike).layoutSizingHorizontal).toBe('FIXED');
    expect(headerRow.children[1] && (headerRow.children[1] as FrameLike).layoutSizingHorizontal).toBe('FIXED');
    expect(descColWidth).toBeGreaterThan(idColWidth);
  });

  it('column width is measured from stripped cell text, not raw markdown markers', async () => {
    // Without stripping, '**bold-marker-padding**' (with ** markers) would measure wider
    // than the plain 'x'-only column; assert the marker characters don't inflate the width
    // beyond what the rendered (stripped) text would produce.
    const doc = parseMarkdown('| A | B |\n| --- | --- |\n| **x** | y |');
    const page = await renderDoc(doc, new FakeFigma());
    const grid = page.children[0] as FrameLike;
    const headerRow = grid.children[0] as FrameLike;
    const firstColWidth = (headerRow.children[0] as FrameLike).width;
    // stripped first-col content is just "x"/"A" (short) — should hit the MIN width,
    // not a width inflated by the raw "**x**" (5 chars) markdown markers.
    expect(firstColWidth).toBe(52); // COL_MIN
  });

  it('table cell renders inline formatting (bold run on a body cell)', async () => {
    const doc = parseMarkdown('| A | B |\n| --- | --- |\n| **bold** | plain |');
    const page = await renderDoc(doc, new FakeFigma());
    const grid = page.children[0] as FrameLike;
    const bodyRow = grid.children[1] as FrameLike;
    const cellFrame = bodyRow.children[0] as FrameLike;
    const t = cellFrame.children[0] as TextLike;
    expect(t.characters).toBe('bold'); // markers stripped from rendered text
    expect(t.getRangeFontName(0, 4)).toEqual({ family: 'Inter', style: 'Bold' });
  });

  it('every table cell stretches to fill the row height (no empty bands)', async () => {
    const doc = parseMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |');
    const page = await renderDoc(doc, new FakeFigma());
    const grid = page.children[0] as FrameLike;
    for (const rowFrame of grid.children as FrameLike[]) {
      for (const cell of rowFrame.children as FrameLike[]) {
        expect(cell.layoutSizingVertical).toBe('FILL');
      }
    }
  });

  it('code block renders as a frame with a visible background', async () => {
    const doc = parseMarkdown('```js\nconst a = 1;\n```');
    const page = await renderDoc(doc, new FakeFigma());
    const code = page.children[0] as FrameLike;
    expect(code.type).toBe('FRAME');
    expect(code.fills.length).toBeGreaterThan(0);
  });

  it('quote renders as a de-emphasized callout (bg + rounded + padding)', async () => {
    const doc = parseMarkdown('> a note');
    const page = await renderDoc(doc, new FakeFigma());
    const quote = page.children[0] as FrameLike;
    expect(quote.type).toBe('FRAME');
    expect(quote.fills.length).toBeGreaterThan(0);
    expect(quote.cornerRadius).toBeGreaterThan(0);
    expect(quote.paddingTop).toBeGreaterThan(0);
  });

  it('inline code gets a distinct code color, not just the mono font (Korean fallback has no mono glyphs)', async () => {
    const doc = parseMarkdown('a `x` b');
    const page = await renderDoc(doc, new FakeFigma(), { theme: 'light' });
    const p = page.children[0] as TextLike;
    // characters: "a x b" -> code run "x" is at index 2
    const codeFill = p.getRangeFills(2, 3);
    expect(codeFill).not.toBe(MIXED);
    const codeColor = (codeFill as any)[0].color;
    expect(codeColor.r).toBeCloseTo(0.78, 1);
    expect(codeColor.g).toBeCloseTo(0.16, 1);
    expect(codeColor.b).toBeCloseTo(0.33, 1);

    // surrounding plain text stays the regular text color (black in light theme)
    const beforeFill = p.getRangeFills(0, 1);
    expect(beforeFill).not.toBe(MIXED);
    const beforeColor = (beforeFill as any)[0].color;
    expect(beforeColor.r).toBeCloseTo(0, 1);
    expect(beforeColor.g).toBeCloseTo(0, 1);
    expect(beforeColor.b).toBeCloseTo(0, 1);
  });

  it('nested list items are indented relative to their parent list', async () => {
    const doc = parseMarkdown('- a\n  - b');
    const page = await renderDoc(doc, new FakeFigma());
    const topList = page.children[0] as FrameLike;
    expect(topList.paddingLeft).toBe(0);
    // children: [item-text "a", nested-sub-list-frame]
    const nested = topList.children[1] as FrameLike;
    expect(nested.type).toBe('FRAME');
    expect(nested.paddingLeft).toBe(20);
  });
});
