export interface Paint {
  type: 'SOLID';
  color: { r: number; g: number; b: number };
}

export interface FontName {
  family: string;
  style: string;
}

export interface BaseLike {
  type: string;
  name: string;
  setPluginData(key: string, value: string): void;
  getPluginData(key: string): string;
  remove(): void;
}

export interface TextLike extends BaseLike {
  type: 'TEXT';
  characters: string;
  fontName: FontName;
  fontSize: number;
  setRangeFontName(start: number, end: number, font: FontName): void;
  setRangeFills(start: number, end: number, fills: Paint[]): void;
  setRangeTextDecoration(start: number, end: number, deco: 'NONE' | 'UNDERLINE'): void;
  getRangeFontName(start: number, end: number): FontName | symbol;
  getRangeFills(start: number, end: number): Paint[] | symbol;
  getRangeHyperlink(start: number, end: number): { type: 'URL'; value: string } | null | symbol;
  setRangeHyperlink(start: number, end: number, link: { type: 'URL'; value: string } | null): void;
}

export interface FrameLike extends BaseLike {
  type: 'FRAME';
  layoutMode: 'NONE' | 'VERTICAL' | 'HORIZONTAL';
  itemSpacing: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  children: SceneLike[];
  appendChild(n: SceneLike): void;
}

export type SceneLike = FrameLike | TextLike;

export interface FigmaLike {
  createFrame(): FrameLike;
  createText(): TextLike;
  loadFontAsync(font: FontName): Promise<void>;
}

export const MIXED: symbol = Symbol('mixed');
