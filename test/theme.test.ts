import { describe, it, expect } from 'vitest';
import { themeFromBackground } from '../src/core/theme';

describe('themeFromBackground — pure luminance judgment', () => {
  it('white background → light', () => {
    expect(themeFromBackground({ r: 1, g: 1, b: 1 })).toBe('light');
  });

  it('black background → dark', () => {
    expect(themeFromBackground({ r: 0, g: 0, b: 0 })).toBe('dark');
  });

  it('mid/dark gray background → dark', () => {
    expect(themeFromBackground({ r: 0.2, g: 0.2, b: 0.2 })).toBe('dark');
  });

  it('null background → light (default)', () => {
    expect(themeFromBackground(null)).toBe('light');
  });

  it('a bright color background → light', () => {
    expect(themeFromBackground({ r: 1, g: 0.9, b: 0.2 })).toBe('light');
  });
});
