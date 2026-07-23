import type { RGB } from './render';

/**
 * 페이지 배경색의 밝기(luminance)로 라이트/다크를 판정한다 (순수 함수).
 * Figma 색상은 0-1 부동소수. 배경이 없으면(null) 라이트로 기본.
 */
export function themeFromBackground(c: RGB | null): 'light' | 'dark' {
  if (!c) return 'light';
  const L = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return L < 0.5 ? 'dark' : 'light';
}
