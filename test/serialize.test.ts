import { describe, it, expect } from 'vitest';
import { serializeDoc } from '../src/core/serialize';

describe('serialize blocks (basic)', () => {
  it('heading', () => {
    expect(serializeDoc({ blocks: [{ type: 'heading', level: 2, inlines: [{ type: 'text', value: 'X' }] }] })).toBe('## X');
  });
  it('divider + paragraph separated by blank line', () => {
    const md = serializeDoc({ blocks: [
      { type: 'paragraph', inlines: [{ type: 'text', value: 'a' }] },
      { type: 'divider' },
      { type: 'paragraph', inlines: [{ type: 'text', value: 'b' }] },
    ]});
    expect(md).toBe('a\n\n---\n\nb');
  });
});
