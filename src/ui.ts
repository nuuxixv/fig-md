const $ = (id: string) => document.getElementById(id) as HTMLElement;

const ta = $('md') as HTMLTextAreaElement;
const plus = $('plus') as HTMLButtonElement;
const pop = $('pop');
const toastEl = $('toast');
const colorToggle = $('color-toggle');
const colors = $('colors');
const cBg = $('c-bg') as HTMLInputElement;
const cFg = $('c-fg') as HTMLInputElement;
const hxBg = $('hx-bg');
const hxFg = $('hx-fg');
const preview = $('pv');

// --- caret tracking (컨텍스트 "+" 삽입용) ---
let caret = { s: ta.value.length, e: ta.value.length };
function remember(): void {
  caret = { s: ta.selectionStart ?? ta.value.length, e: ta.selectionEnd ?? ta.value.length };
}
['keyup', 'click', 'select', 'input'].forEach(ev => ta.addEventListener(ev, remember));
ta.addEventListener('focus', () => { plus.disabled = false; remember(); });

function insertAtCaret(text: string): void {
  ta.value = ta.value.slice(0, caret.s) + text + ta.value.slice(caret.e);
  const p = caret.s + text.length;
  caret = { s: p, e: p };
  ta.focus();
  ta.selectionStart = ta.selectionEnd = p;
  closePop();
}

function openPop(): void {
  pop.classList.add('show');
  plus.classList.add('open');
  plus.setAttribute('aria-expanded', 'true');
  ($('tbl-dim') as HTMLInputElement).focus();
}
function closePop(): void {
  pop.classList.remove('show');
  plus.classList.remove('open');
  plus.setAttribute('aria-expanded', 'false');
}
plus.addEventListener('click', (e) => {
  e.stopPropagation();
  if (plus.disabled) return;
  pop.classList.contains('show') ? closePop() : openPop();
});
document.addEventListener('click', (e) => {
  if (!pop.contains(e.target as Node) && e.target !== plus && !plus.contains(e.target as Node)) closePop();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePop(); });

$('ins-hr').addEventListener('click', () => insertAtCaret('\n---\n'));
$('ins-tbl').addEventListener('click', () => {
  const raw = (($('tbl-dim') as HTMLInputElement).value || '').trim().toLowerCase().replace(/×/g, 'x');
  const m = raw.match(/^(\d+)\s*x\s*(\d+)$/);
  if (!m) { toast('규격은 행x열 (예: 3x2)'); return; }
  const rows = Math.min(Math.max(parseInt(m[1], 10), 1), 20);
  const cols = Math.min(Math.max(parseInt(m[2], 10), 1), 10);
  const head = '| ' + Array.from({ length: cols }, (_, i) => '헤더' + (i + 1)).join(' | ') + ' |';
  const sep = '| ' + Array.from({ length: cols }, () => '---').join(' | ') + ' |';
  const body = Array.from({ length: Math.max(rows - 1, 0) }, () => '| ' + Array.from({ length: cols }, () => '값').join(' | ') + ' |').join('\n');
  insertAtCaret('\n' + [head, sep, body].filter(Boolean).join('\n') + '\n');
});

// --- 색상 직접 지정 토글 ---
function syncColors(): void {
  const bg = cBg.value, fg = cFg.value;
  hxBg.textContent = bg.toUpperCase();
  hxFg.textContent = fg.toUpperCase();
  preview.setAttribute('style', `background:${bg}; color:${fg}; border-color:color-mix(in srgb,${fg} 16%, transparent)`);
}
cBg.addEventListener('input', syncColors);
cFg.addEventListener('input', syncColors);

function setColorOverride(on: boolean): void {
  colorToggle.setAttribute('aria-checked', String(on));
  colors.classList.toggle('open', on);
  cBg.disabled = !on;
  cFg.disabled = !on;
}
colorToggle.addEventListener('click', () => {
  const on = colorToggle.getAttribute('aria-checked') !== 'true';
  setColorOverride(on);
});

// --- 플러그인 메시지 배선 ---
function isColorOverrideOn(): boolean {
  return colorToggle.getAttribute('aria-checked') === 'true';
}

$('do-render').addEventListener('click', () => {
  const bundle: { type: string; md: string; colors?: { bg: string; fg: string } } = {
    type: 'render',
    md: ta.value,
  };
  if (isColorOverrideOn()) {
    bundle.colors = { bg: cBg.value, fg: cFg.value };
  }
  parent.postMessage({ pluginMessage: bundle }, '*');
});

$('do-export').addEventListener('click', () => {
  parent.postMessage({ pluginMessage: { type: 'export' } }, '*');
});

let toastTimer: ReturnType<typeof setTimeout> | undefined;
function toast(m: string): void {
  toastEl.textContent = m;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

onmessage = (e: MessageEvent) => {
  const m = e.data.pluginMessage;
  if (!m) return;
  if (m.type === 'exported') {
    ta.value = m.md;
    ta.select();
    document.execCommand('copy');
    ta.selectionStart = ta.selectionEnd = ta.value.length;
    toast(m.warnings && m.warnings.length ? '경고(건너뜀):\n' + m.warnings.join('\n') : '내보냄 + 클립보드 복사 완료');
  } else if (m.type === 'error') {
    toast('오류: ' + m.message);
  }
};

syncColors();
