import type { Doc, Block, List } from './model';
import { serializeInlines } from './inline';

export function serializeDoc(doc: Doc): string {
  return doc.blocks.map(serializeBlock).join('\n\n');
}

// 이후 Task들이 여기에 자기 블록 분기를 추가한다.
export function serializeBlock(b: Block): string {
  switch (b.type) {
    case 'heading': return '#'.repeat(b.level) + ' ' + serializeInlines(b.inlines);
    case 'paragraph': return serializeInlines(b.inlines);
    case 'divider': return '---';
    case 'list': return serializeList(b, 0);
    case 'quote': return b.children.map(c => '> ' + serializeBlock(c)).join('\n');
    case 'code': return '```' + b.lang + '\n' + b.value + '\n```';
    case 'image': return `![${b.alt}](${b.src})`;
    case 'table': {
      const head = '| ' + b.header.join(' | ') + ' |';
      const sep = '| ' + b.header.map(() => '---').join(' | ') + ' |';
      const body = b.rows.map(r => '| ' + r.join(' | ') + ' |').join('\n');
      return [head, sep, body].filter(Boolean).join('\n');
    }
    default: return ''; // 다른 타입은 후속 Task에서 채움
  }
}

function serializeList(list: List, level: number): string {
  const pad = '  '.repeat(level);
  const lines: string[] = [];
  list.items.forEach((it, idx) => {
    const marker = list.ordered ? `${idx + 1}.` : '-';
    const box = it.checked === null ? '' : it.checked ? '[x] ' : '[ ] ';
    lines.push(`${pad}${marker} ${box}${serializeInlines(it.inlines)}`);
    it.children.forEach(child => lines.push(serializeList(child, level + 1)));
  });
  return lines.join('\n');
}
