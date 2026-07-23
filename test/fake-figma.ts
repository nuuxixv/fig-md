import type { FigmaLike, FrameLike, TextLike, SceneLike, FontName, Paint } from '../src/core/figma-like';
import { MIXED } from '../src/core/figma-like';

class Base {
  name = '';
  data: Record<string, string> = {};

  setPluginData(k: string, v: string) {
    this.data[k] = v;
  }

  getPluginData(k: string) {
    return this.data[k] ?? '';
  }

  remove() {}
}

function fontKey(f: FontName): string {
  return `${f.family} ${f.style}`;
}

class FakeText extends Base implements TextLike {
  type = 'TEXT' as const;
  characters = '';
  fontSize = 16;
  fonts: FontName[] = [];
  rangeFills: Paint[][] = [];
  fills: Paint[] = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  links: ({ type: 'URL'; value: string } | null)[] = [];
  textAutoResize: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'TRUNCATE' = 'WIDTH_AND_HEIGHT';
  layoutSizingHorizontal: 'FIXED' | 'HUG' | 'FILL' = 'FIXED';
  layoutSizingVertical: 'FIXED' | 'HUG' | 'FILL' = 'FIXED';

  private loadedFonts: Set<string>;
  private _fontName: FontName = { family: 'Inter', style: 'Regular' };

  constructor(loadedFonts: Set<string>) {
    super();
    this.loadedFonts = loadedFonts;
  }

  get fontName(): FontName {
    return this._fontName;
  }

  set fontName(f: FontName) {
    if (!this.loadedFonts.has(fontKey(f))) {
      throw new Error('Cannot use unloaded font: ' + f.family + ' ' + f.style);
    }
    this._fontName = f;
  }

  private ensure(n: number) {
    while (this.fonts.length < n) this.fonts.push(this._fontName);
    while (this.rangeFills.length < n)
      this.rangeFills.push([{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]);
    while (this.links.length < n) this.links.push(null);
  }

  setRangeFontName(s: number, e: number, f: FontName) {
    if (!this.loadedFonts.has(fontKey(f))) {
      throw new Error('Cannot use unloaded font: ' + f.family + ' ' + f.style);
    }
    this.ensure(e);
    for (let i = s; i < e; i++) this.fonts[i] = f;
  }

  setRangeFills(s: number, e: number, f: Paint[]) {
    this.ensure(e);
    for (let i = s; i < e; i++) this.rangeFills[i] = f;
  }

  setRangeTextDecoration() {}

  setRangeHyperlink(s: number, e: number, l: { type: 'URL'; value: string } | null) {
    this.ensure(e);
    for (let i = s; i < e; i++) this.links[i] = l;
  }

  getRangeFontName(s: number, e: number): FontName | symbol {
    this.ensure(Math.max(e, s + 1));
    const first = this.fonts[s];
    for (let i = s; i < e; i++) {
      if (this.fonts[i].family !== first.family || this.fonts[i].style !== first.style) {
        return MIXED;
      }
    }
    return first;
  }

  getRangeFills(s: number, e: number): Paint[] | symbol {
    this.ensure(Math.max(e, s + 1));
    const first = this.rangeFills[s];
    for (let i = s; i < e; i++) {
      if (!this.fillsEqual(this.rangeFills[i], first)) {
        return MIXED;
      }
    }
    return first;
  }

  private fillsEqual(a: Paint[], b: Paint[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const aPaint = a[i];
      const bPaint = b[i];
      if (aPaint.type !== bPaint.type) return false;
      if (aPaint.type === 'SOLID' && bPaint.type === 'SOLID') {
        const aColor = (aPaint as any).color;
        const bColor = (bPaint as any).color;
        if (aColor.r !== bColor.r || aColor.g !== bColor.g || aColor.b !== bColor.b) {
          return false;
        }
      }
    }
    return true;
  }

  getRangeHyperlink(s: number, e: number): { type: 'URL'; value: string } | null | symbol {
    this.ensure(Math.max(e, s + 1));
    const first = this.links[s];
    for (let i = s; i < e; i++)
      if ((this.links[i]?.value ?? null) !== (first?.value ?? null)) return MIXED;
    return first;
  }
}

class FakeFrame extends Base implements FrameLike {
  type = 'FRAME' as const;
  layoutMode: 'NONE' | 'VERTICAL' | 'HORIZONTAL' = 'NONE';
  itemSpacing = 0;
  paddingTop = 0;
  paddingBottom = 0;
  paddingLeft = 0;
  paddingRight = 0;
  children: SceneLike[] = [];
  width = 100;
  height = 100;
  primaryAxisSizingMode: 'FIXED' | 'AUTO' = 'AUTO';
  counterAxisSizingMode: 'FIXED' | 'AUTO' = 'AUTO';
  layoutSizingHorizontal: 'FIXED' | 'HUG' | 'FILL' = 'FIXED';
  layoutSizingVertical: 'FIXED' | 'HUG' | 'FILL' = 'FIXED';
  fills: Paint[] = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  strokes: Paint[] = [];
  strokeWeight = 1;

  appendChild(n: SceneLike) {
    this.children.push(n);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}

export class FakeFigma implements FigmaLike {
  private loadedFonts = new Set<string>();

  createFrame(): FrameLike {
    return new FakeFrame();
  }

  createText(): TextLike {
    return new FakeText(this.loadedFonts);
  }

  async loadFontAsync(font: FontName) {
    this.loadedFonts.add(fontKey(font));
  }
}
