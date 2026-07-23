const $ = (id: string) => document.getElementById(id) as HTMLElement;
const md = () => ($('md') as HTMLTextAreaElement);
const warn = () => $('warn');

$('render').onclick = () => parent.postMessage({ pluginMessage: { type: 'render', md: md().value } }, '*');
$('export').onclick = () => parent.postMessage({ pluginMessage: { type: 'export' } }, '*');
$('ins-divider').onclick = () => parent.postMessage({ pluginMessage: { type: 'insert', block: 'divider' } }, '*');
$('ins-table').onclick = () => parent.postMessage({ pluginMessage: { type: 'insert', block: 'table' } }, '*');

onmessage = (e: MessageEvent) => {
  const m = e.data.pluginMessage;
  if (!m) return;
  if (m.type === 'exported') {
    md().value = m.md;
    md().select();
    document.execCommand('copy');
    warn().textContent = m.warnings.length ? '경고(건너뜀):\n' + m.warnings.join('\n') : '내보냄 + 클립보드 복사 완료';
  } else if (m.type === 'error') {
    warn().textContent = '오류: ' + m.message;
  }
};
