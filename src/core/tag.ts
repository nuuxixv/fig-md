import type { BaseLike } from './figma-like';

export const NS = 'figmd';
const BLOCK = `${NS}:block`;
const META = `${NS}:meta`;
const CELL = `${NS}:cell`;

export function setBlockTag(n: BaseLike, type: string, meta: any = {}): void {
  n.setPluginData(BLOCK, type);
  n.setPluginData(META, JSON.stringify(meta));
}

export function getBlockTag(n: BaseLike): { type: string; meta: any } | null {
  const type = n.getPluginData(BLOCK);
  if (!type) return null;
  const raw = n.getPluginData(META);
  return { type, meta: raw ? JSON.parse(raw) : {} };
}

export function setCellTag(n: BaseLike, r: number, c: number): void {
  n.setPluginData(CELL, JSON.stringify({ r, c }));
}

export function getCellTag(n: BaseLike): { r: number; c: number } | null {
  const raw = n.getPluginData(CELL);
  return raw ? JSON.parse(raw) : null;
}
