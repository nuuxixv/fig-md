// src/core/model.ts — 문서모델 타입 정의 (모듈 계약)

export type Inline =
  | { type: 'text'; value: string }
  | { type: 'strong'; children: Inline[] }
  | { type: 'em'; children: Inline[] }
  | { type: 'code'; value: string }
  | { type: 'link'; href: string; children: Inline[] };

export interface Heading   { type: 'heading'; level: 1 | 2 | 3; inlines: Inline[]; }
export interface Paragraph { type: 'paragraph'; inlines: Inline[]; }
export interface Divider   { type: 'divider'; }
export interface CodeBlock { type: 'code'; lang: string; value: string; }
export interface ImageBlock{ type: 'image'; src: string; alt: string; }
export interface Quote     { type: 'quote'; children: Block[]; }
export interface ListItem  { inlines: Inline[]; checked: boolean | null; children: List[]; }
export interface List      { type: 'list'; ordered: boolean; items: ListItem[]; }
export interface Table     { type: 'table'; header: string[]; rows: string[][]; }
export type Block = Heading | Paragraph | Divider | CodeBlock | ImageBlock | Quote | List | Table;
export interface Doc { blocks: Block[]; }

// 인라인 평탄화(렌더용)
export interface Run { text: string; bold: boolean; italic: boolean; code: boolean; href: string | null; }
