import { parseMarkdown } from './core/parse';
import { serializeDoc } from './core/serialize';
import { renderDoc } from './core/render';
import { readDoc } from './core/read';
import { getBlockTag } from './core/tag';
import type { FrameLike } from './core/figma-like';

figma.showUI(__html__, { width: 380, height: 560 });

// figma 전역을 FigmaLike로 어댑트: 실제 API가 서브셋을 만족한다.
const adapter = {
  createFrame: () => figma.createFrame() as unknown as FrameLike,
  createText: () => figma.createText() as any,
  loadFontAsync: (f: { family: string; style: string }) => figma.loadFontAsync(f),
};

figma.ui.onmessage = async (msg: { type: string; md?: string; block?: 'divider' | 'table' }) => {
  try {
    if (msg.type === 'render') {
      const doc = parseMarkdown(msg.md ?? '');
      const page = await renderDoc(doc, adapter as any);
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
    } else if (msg.type === 'insert') {
      const sel = figma.currentPage.selection[0];
      const page = isPageFrame(sel) ? sel : findLatestPage();
      if (!page || page.type !== 'FRAME') { figma.ui.postMessage({ type: 'error', message: 'Fig.md 페이지를 선택하세요.' }); return; }
      const block = msg.block === 'table'
        ? { type: 'table', header: ['열1', '열2'], rows: [['', '']] } as const
        : { type: 'divider' } as const;
      const doc = { blocks: [block] };
      const tmp = await renderDoc(doc as any, adapter as any);
      const child = (tmp as any).children[0] as SceneNode;
      (page as FrameNode).appendChild(child);
      tmp.remove();
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
