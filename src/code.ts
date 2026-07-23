import { parseMarkdown } from './core/parse';
import { serializeDoc } from './core/serialize';
import { renderDoc } from './core/render';
import type { RGB } from './core/render';
import { themeFromBackground } from './core/theme';
import { readDoc } from './core/read';
import { getBlockTag } from './core/tag';
import type { FrameLike } from './core/figma-like';

figma.showUI(__html__, { width: 400, height: 640 });

// figma 전역을 FigmaLike로 어댑트: 실제 API가 서브셋을 만족한다.
const adapter = {
  createFrame: () => figma.createFrame() as unknown as FrameLike,
  createText: () => figma.createText() as any,
  loadFontAsync: (f: { family: string; style: string }) => figma.loadFontAsync(f),
};

// 현재 Figma 페이지의 배경 단색을 읽는다. 페이지 배경 밝기로 라이트/다크를 판정한다
// (DESIGN.md "테마 모델" — 시스템/Figma UI 테마가 아니라 작업 중인 페이지 배경 기준).
function pageBgColor(): RGB | null {
  const b = figma.currentPage.backgrounds.find(p => p.type === 'SOLID') as SolidPaint | undefined;
  return b ? { r: b.color.r, g: b.color.g, b: b.color.b } : null;
}

function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  const n = parseInt(clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

function resolveOverride(colors?: { bg?: string; fg?: string }): { bg?: RGB; fg?: RGB } | undefined {
  if (!colors) return undefined;
  const bg = colors.bg ? hexToRgb(colors.bg) : undefined;
  const fg = colors.fg ? hexToRgb(colors.fg) : undefined;
  if (!bg && !fg) return undefined;
  return { bg, fg };
}

figma.ui.onmessage = async (msg: { type: string; md?: string; colors?: { bg?: string; fg?: string } }) => {
  try {
    if (msg.type === 'render') {
      const doc = parseMarkdown(msg.md ?? '');
      const theme = themeFromBackground(pageBgColor());
      const override = resolveOverride(msg.colors);
      const page = await renderDoc(doc, adapter as any, { theme, override });
      const node = page as unknown as FrameNode;
      figma.currentPage.appendChild(node);
      figma.viewport.scrollAndZoomIntoView([node]);
      figma.currentPage.selection = [node];
    } else if (msg.type === 'export') {
      const sel = figma.currentPage.selection[0];
      const page = (sel && isPageFrame(sel) ? sel : findLatestPage()) as unknown as FrameLike | null;
      if (!page) { figma.ui.postMessage({ type: 'error', message: '내보낼 Fig.md 페이지 프레임을 선택하세요.' }); return; }
      const { doc, warnings } = readDoc(page);
      figma.ui.postMessage({ type: 'exported', md: serializeDoc(doc), warnings });
    }
  } catch (e) {
    figma.ui.postMessage({ type: 'error', message: String(e) });
  }
};

// Fig.md가 생성한 "page" 블록 프레임인지 확인한다. tag.ts의 getBlockTag를 통해서만 판별하며,
// 'figmd:block' 문자열 리터럴을 여기서 직접 다루지 않는다(단일 출처 유지).
function isPageFrame(node: SceneNode | null | undefined): node is FrameNode {
  return !!node && node.type === 'FRAME' && getBlockTag(node as any)?.type === 'page';
}

function findLatestPage(): SceneNode | null {
  const frames = figma.currentPage.children.filter(n => isPageFrame(n));
  return (frames[frames.length - 1] as SceneNode) ?? null;
}
