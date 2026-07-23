import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/core/parse';
import { renderDoc } from '../src/core/render';
import { FakeFigma } from './fake-figma';
import type { FrameLike, TextLike } from '../src/core/figma-like';

describe('renderDoc — theme-aware palette', () => {
  it('defaults to light theme: page fill is white', async () => {
    const doc = parseMarkdown('# Title\n\nsome paragraph text');
    const page = await renderDoc(doc, new FakeFigma());
    const color = page.fills[0].color;
    expect(color.r).toBe(1);
    expect(color.g).toBe(1);
    expect(color.b).toBe(1);
  });

  it('explicit light theme: page fill is white', async () => {
    const doc = parseMarkdown('# Title\n\nsome paragraph text');
    const page = await renderDoc(doc, new FakeFigma(), { theme: 'light' });
    const color = page.fills[0].color;
    expect(color.r).toBe(1);
    expect(color.g).toBe(1);
    expect(color.b).toBe(1);
  });

  it('dark theme: page fill is dark, text fill is light (node-level fills)', async () => {
    const doc = parseMarkdown('# Title\n\nsome paragraph text');
    const page = await renderDoc(doc, new FakeFigma(), { theme: 'dark' });
    const pageColor = page.fills[0].color;
    expect(pageColor.r).toBeLessThan(0.2);

    // real Figma only reliably reflects color via node-level `fills`, not
    // setRangeFills without a prior setRangeFontName over that range.
    const paragraph = page.children[1] as TextLike;
    const textColor = paragraph.fills[0].color;
    expect(textColor.r).toBeGreaterThan(0.9);
  });

  it('override replaces page bg and text fg, other tokens follow theme', async () => {
    const doc = parseMarkdown('# Title\n\nsome paragraph text');
    const override = { bg: { r: 0.5, g: 0, b: 0 }, fg: { r: 0, g: 1, b: 0 } };
    const page = await renderDoc(doc, new FakeFigma(), { theme: 'light', override });
    const pageColor = page.fills[0].color;
    expect(pageColor).toEqual(override.bg);

    const paragraph = page.children[1] as TextLike;
    const textColor = paragraph.fills[0].color;
    expect(textColor).toEqual(override.fg);
  });

  it('dark theme: table cell text is light via node-level fills (real-Figma-safe)', async () => {
    const doc = parseMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |');
    const page = await renderDoc(doc, new FakeFigma(), { theme: 'dark' });
    const grid = page.children[0] as FrameLike;
    const row = grid.children[0] as FrameLike;
    const cell = row.children[0] as FrameLike;
    const cellText = cell.children[0] as TextLike;
    expect(cellText.fills[0].color.r).toBeGreaterThan(0.9);
  });

  it('light theme: table cell text is dark via node-level fills', async () => {
    const doc = parseMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |');
    const page = await renderDoc(doc, new FakeFigma(), { theme: 'light' });
    const grid = page.children[0] as FrameLike;
    const row = grid.children[0] as FrameLike;
    const cell = row.children[0] as FrameLike;
    const cellText = cell.children[0] as TextLike;
    expect(cellText.fills[0].color.r).toBeLessThan(0.1);
  });

  it('dark theme: quote child text is colored with the dark palette quoteText, not black', async () => {
    const doc = parseMarkdown('> a note');
    const page = await renderDoc(doc, new FakeFigma(), { theme: 'dark' });
    const quote = page.children[0] as FrameLike;
    const quoteText = quote.children[0] as TextLike;
    expect(quoteText.fills[0].color.r).toBeCloseTo(0.70, 2);
  });

  it('override bg=white drives the WHOLE palette light even under dark page theme (table bg + text)', async () => {
    const doc = parseMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |');
    const page = await renderDoc(doc, new FakeFigma(), { theme: 'dark', override: { bg: { r: 1, g: 1, b: 1 } } });
    expect(page.fills[0].color.r).toBeGreaterThan(0.9);
    const grid = page.children[0] as FrameLike;
    const row = grid.children[0] as FrameLike;
    const cell = row.children[0] as FrameLike;
    expect(cell.fills[0].color.r).toBeGreaterThan(0.9); // header cell bg = LIGHT palette
    const cellText = cell.children[0] as TextLike;
    expect(cellText.fills[0].color.r).toBeLessThan(0.1); // text = LIGHT palette black
  });

  it('override bg=dark drives the WHOLE palette dark even under light page theme', async () => {
    const doc = parseMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |');
    const page = await renderDoc(doc, new FakeFigma(), { theme: 'light', override: { bg: { r: 0.05, g: 0.05, b: 0.05 } } });
    const grid = page.children[0] as FrameLike;
    const row = grid.children[0] as FrameLike;
    const cell = row.children[0] as FrameLike;
    expect(cell.fills[0].color.r).toBeLessThan(0.25); // dark header bg
    const cellText = cell.children[0] as TextLike;
    expect(cellText.fills[0].color.r).toBeGreaterThan(0.9); // light text
  });
});
