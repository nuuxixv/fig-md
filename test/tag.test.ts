import { describe, it, expect } from 'vitest';
import { setBlockTag, getBlockTag, setCellTag, getCellTag } from '../src/core/tag';
import { FakeFigma } from './fake-figma';

describe('tag helpers', () => {
  it('block tag roundtrip', () => {
    const f = new FakeFigma();
    const n = f.createFrame();
    setBlockTag(n, 'heading', { level: 2 });
    expect(getBlockTag(n)).toEqual({ type: 'heading', meta: { level: 2 } });
  });
  it('no tag returns null', () => {
    const f = new FakeFigma();
    expect(getBlockTag(f.createFrame())).toBeNull();
  });
  it('cell tag roundtrip', () => {
    const f = new FakeFigma();
    const n = f.createText();
    setCellTag(n, 1, 2);
    expect(getCellTag(n)).toEqual({ r: 1, c: 2 });
  });
});
