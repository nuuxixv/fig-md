import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/core/parse';
import { renderDoc } from '../src/core/render';
import { FakeFigma } from './fake-figma';
import type { FrameLike, TextLike } from '../src/core/figma-like';

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

  it('table rows and cells fill the available width', async () => {
    const doc = parseMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |');
    const page = await renderDoc(doc, new FakeFigma());
    const grid = page.children[0] as FrameLike;
    expect(grid.children.length).toBeGreaterThan(0);
    for (const rowFrame of grid.children as FrameLike[]) {
      expect(rowFrame.layoutSizingHorizontal).toBe('FILL');
      for (const cell of rowFrame.children as FrameLike[]) {
        expect(cell.layoutSizingHorizontal).toBe('FILL');
      }
    }
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
});
