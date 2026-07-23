import type { Inline, Run } from './model';

export function flattenInlines(xs: Inline[]): Run[] {
  const out: Run[] = [];
  const walk = (node: Inline, s: { bold: boolean; italic: boolean; code: boolean; href: string | null }) => {
    switch (node.type) {
      case 'text': out.push({ text: node.value, ...s }); break;
      case 'code': out.push({ text: node.value, bold: s.bold, italic: s.italic, code: true, href: s.href }); break;
      case 'strong': node.children.forEach(c => walk(c, { ...s, bold: true })); break;
      case 'em': node.children.forEach(c => walk(c, { ...s, italic: true })); break;
      case 'link': node.children.forEach(c => walk(c, { ...s, href: node.href })); break;
    }
  };
  xs.forEach(x => walk(x, { bold: false, italic: false, code: false, href: null }));
  return out;
}

// Run[] → Inline[]: link > strong > em > code 우선순위로 감싼다(평탄화의 역).
export function runsToInlines(rs: Run[]): Inline[] {
  return rs.map(r => {
    let node: Inline = r.code ? { type: 'code', value: r.text } : { type: 'text', value: r.text };
    if (r.italic && !r.code) node = { type: 'em', children: [node] };
    if (r.bold && !r.code) node = { type: 'strong', children: [node] };
    if (r.href) node = { type: 'link', href: r.href, children: [node] };
    return node;
  });
}

// 인라인 토크나이저: `code`, **strong**, *em*, [text](href), 나머지는 text.
// 우선순위: 코드(백틱)를 먼저 떼고, 그다음 링크, 강조.
export function parseInlines(s: string): Inline[] {
  const out: Inline[] = [];
  let i = 0;
  let buf = '';
  const flush = () => { if (buf) { out.push({ type: 'text', value: buf }); buf = ''; } };
  while (i < s.length) {
    const c = s[i];
    // 백슬래시 이스케이프: \\, \`, \*, \[ 는 다음 문자를 리터럴로 취급(마커로 해석하지 않음)
    if (c === '\\' && i + 1 < s.length && '\\`*['.includes(s[i + 1])) {
      buf += s[i + 1]; i += 2; continue;
    }
    if (c === '`') {
      const end = s.indexOf('`', i + 1);
      if (end > i) { flush(); out.push({ type: 'code', value: s.slice(i + 1, end) }); i = end + 1; continue; }
    }
    if (c === '[') {
      const close = s.indexOf('](', i);
      const paren = close > -1 ? s.indexOf(')', close) : -1;
      if (close > i && paren > close) {
        flush();
        const label = s.slice(i + 1, close);
        const href = s.slice(close + 2, paren);
        out.push({ type: 'link', href, children: parseInlines(label) });
        i = paren + 1; continue;
      }
    }
    if (c === '*' && s[i + 1] === '*') {
      const end = s.indexOf('**', i + 2);
      if (end > i) { flush(); out.push({ type: 'strong', children: parseInlines(s.slice(i + 2, end)) }); i = end + 2; continue; }
    }
    if (c === '*') {
      const end = s.indexOf('*', i + 1);
      if (end > i) { flush(); out.push({ type: 'em', children: parseInlines(s.slice(i + 1, end)) }); i = end + 1; continue; }
    }
    buf += c; i++;
  }
  flush();
  return out;
}

export function serializeInlines(xs: Inline[]): string {
  return xs.map(x => {
    switch (x.type) {
      case 'text': return x.value.replace(/[\\`*[]/g, '\\$&');
      case 'code': return '`' + x.value + '`';
      case 'strong': return '**' + serializeInlines(x.children) + '**';
      case 'em': return '*' + serializeInlines(x.children) + '*';
      case 'link': return '[' + serializeInlines(x.children) + '](' + x.href + ')';
    }
  }).join('');
}
