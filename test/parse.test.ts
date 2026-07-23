import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/core/parse';

describe('parse blocks (basic)', () => {
  it('heading levels', () => {
    expect(parseMarkdown('# A').blocks[0]).toEqual({ type: 'heading', level: 1, inlines: [{ type: 'text', value: 'A' }] });
    expect(parseMarkdown('### C').blocks[0]).toEqual({ type: 'heading', level: 3, inlines: [{ type: 'text', value: 'C' }] });
  });
  it('divider', () => {
    expect(parseMarkdown('---').blocks[0]).toEqual({ type: 'divider' });
  });
  it('paragraph joins consecutive lines with space', () => {
    expect(parseMarkdown('one\ntwo').blocks[0]).toEqual({ type: 'paragraph', inlines: [{ type: 'text', value: 'one two' }] });
  });
  it('blank line separates paragraphs', () => {
    const d = parseMarkdown('a\n\nb');
    expect(d.blocks.length).toBe(2);
    expect(d.blocks[1]).toEqual({ type: 'paragraph', inlines: [{ type: 'text', value: 'b' }] });
  });
});
