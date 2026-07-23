const $ = (id: string) => document.getElementById(id) as HTMLElement;
const md = () => ($('md') as HTMLTextAreaElement);
const warn = () => $('warn');

function insertAtCursor(text: string): void {
  const ta = md();
  const start = ta.selectionStart ?? ta.value.length;
  const end = ta.selectionEnd ?? ta.value.length;
  ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
  const caret = start + text.length;
  ta.selectionStart = ta.selectionEnd = caret;
  ta.focus();
}

$('render').onclick = () => parent.postMessage({ pluginMessage: { type: 'render', md: md().value } }, '*');
$('export').onclick = () => parent.postMessage({ pluginMessage: { type: 'export' } }, '*');
$('ins-divider').onclick = () => insertAtCursor('\n---\n');
$('ins-table').onclick = () => insertAtCursor('\n| 열1 | 열2 |\n| --- | --- |\n| 값1 | 값2 |\n');

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
