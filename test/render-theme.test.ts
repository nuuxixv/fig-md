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

  it('dark theme: page fill is dark, text fill is light', async () => {
    const doc = parseMarkdown('# Title\n\nsome paragraph text');
    const page = await renderDoc(doc, new FakeFigma(), { theme: 'dark' });
    const pageColor = page.fills[0].color;
    expect(pageColor.r).toBeLessThan(0.2);

    const paragraph = page.children[1] as TextLike;
    const textColor = (paragraph.getRangeFills(0, paragraph.characters.length) as any)[0].color;
    expect(textColor.r).toBeGreaterThan(0.9);
  });

  it('override replaces page bg and text fg, other tokens follow theme', async () => {
    const doc = parseMarkdown('# Title\n\nsome paragraph text');
    const override = { bg: { r: 0.5, g: 0, b: 0 }, fg: { r: 0, g: 1, b: 0 } };
    const page = await renderDoc(doc, new FakeFigma(), { theme: 'light', override });
    const pageColor = page.fills[0].color;
    expect(pageColor).toEqual(override.bg);

    const paragraph = page.children[1] as TextLike;
    const textColor = (paragraph.getRangeFills(0, paragraph.characters.length) as any)[0].color;
    expect(textColor).toEqual(override.fg);
  });
});
