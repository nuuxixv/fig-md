const $ = (id: string) => document.getElementById(id) as HTMLElement;

const ta = $('md') as HTMLTextAreaElement;
const plus = $('plus') as HTMLButtonElement;
const pop = $('pop');
const toastEl = $('toast');

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

// --- 커스텀 컬러 픽커 ---
const colors: { bg: string; fg: string } = { bg: '#FFFFFF', fg: '#000000' };
let target: 'bg' | 'fg' | null = null;
let hsv = { h: 0, s: 0, v: 1 };

const hx2rgb = (h: string) => {
  const c = h.replace('#', '');
  const n = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
const rgb2hx = (r: number, g: number, b: number) => {
  const h = (x: number) => Math.round(x).toString(16).padStart(2, '0');
  return ('#' + h(r) + h(g) + h(b)).toUpperCase();
};
const rgb2hsv = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: mx ? d / mx : 0, v: mx };
};
const hsv2rgb = (h: number, s: number, v: number) => {
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
};

const sv = $('sv');
const hue = $('hue');
const svThumb = $('svThumb');
const hueThumb = $('hueThumb');
const pkHex = $('pkHex') as HTMLInputElement;
const picker = $('picker');

function syncPreview(): void {
  const pv = $('pv');
  pv.style.background = colors.bg;
  pv.style.color = colors.fg;
  pv.style.borderColor = `color-mix(in srgb,${colors.fg} 16%, transparent)`;
}

function renderPicker(): void {
  const hr = hsv2rgb(hsv.h, 1, 1);
  sv.style.background = `linear-gradient(to top,#000,rgba(0,0,0,0)),linear-gradient(to right,#fff,rgb(${hr.r},${hr.g},${hr.b}))`;
  svThumb.style.left = (hsv.s * 100) + '%';
  svThumb.style.top = ((1 - hsv.v) * 100) + '%';
  hueThumb.style.left = (hsv.h / 360 * 100) + '%';
  const rgb = hsv2rgb(hsv.h, hsv.s, hsv.v);
  const hex = rgb2hx(rgb.r, rgb.g, rgb.b);
  pkHex.value = hex;
  if (target) {
    colors[target] = hex;
    ($('sw-' + target) as HTMLElement).style.background = hex;
    ($('hx-' + target) as HTMLElement).textContent = hex;
  }
  syncPreview();
}

function openPicker(t: 'bg' | 'fg'): void {
  target = t;
  ($('sw-bg') as HTMLElement).classList.toggle('active', t === 'bg');
  ($('sw-fg') as HTMLElement).classList.toggle('active', t === 'fg');
  const c = hx2rgb(colors[t]);
  hsv = rgb2hsv(c.r, c.g, c.b);
  picker.classList.add('open');
  renderPicker();
}
($('sw-bg') as HTMLElement).addEventListener('click', () => openPicker('bg'));
($('sw-fg') as HTMLElement).addEventListener('click', () => openPicker('fg'));

const svPos = (e: PointerEvent) => {
  const r = sv.getBoundingClientRect();
  hsv.s = Math.min(Math.max(e.clientX - r.left, 0), r.width) / r.width;
  hsv.v = 1 - Math.min(Math.max(e.clientY - r.top, 0), r.height) / r.height;
  renderPicker();
};
const huePos = (e: PointerEvent) => {
  const r = hue.getBoundingClientRect();
  hsv.h = Math.min(Math.max(e.clientX - r.left, 0), r.width) / r.width * 360;
  renderPicker();
};
const drag = (el: HTMLElement, fn: (e: PointerEvent) => void) => {
  el.addEventListener('pointerdown', (e: PointerEvent) => {
    el.setPointerCapture(e.pointerId);
    fn(e);
    const mv = (ev: PointerEvent) => fn(ev);
    const up = () => {
      el.removeEventListener('pointermove', mv);
      el.removeEventListener('pointerup', up);
    };
    el.addEventListener('pointermove', mv);
    el.addEventListener('pointerup', up);
  });
};
drag(sv, svPos);
drag(hue, huePos);

pkHex.addEventListener('input', () => {
  const v = pkHex.value.trim();
  if (/^#?[0-9a-fA-F]{3}$/.test(v) || /^#?[0-9a-fA-F]{6}$/.test(v)) {
    const c = hx2rgb(v.startsWith('#') ? v : '#' + v);
    hsv = rgb2hsv(c.r, c.g, c.b);
    renderPicker();
  }
});

['#FFFFFF', '#F5F5F7', '#FFF7E6', '#1C1C1E', '#000000', '#0A84FF'].forEach(col => {
  const b = document.createElement('button');
  b.className = 'preset';
  b.type = 'button';
  b.style.background = col;
  b.title = col;
  b.addEventListener('click', () => {
    const c = hx2rgb(col);
    hsv = rgb2hsv(c.r, c.g, c.b);
    renderPicker();
  });
  $('presets').appendChild(b);
});

($('sw-bg') as HTMLElement).style.background = colors.bg;
($('sw-fg') as HTMLElement).style.background = colors.fg;
syncPreview();

// --- 테마 변경 펼침(디스클로저) ---
const disc = $('disc');
const colorsSection = $('colors');
disc.addEventListener('click', () => {
  const open = colorsSection.classList.toggle('open');
  disc.setAttribute('aria-expanded', String(open));
});

// --- 플러그인 메시지 배선 ---
function isColorOverrideOn(): boolean {
  return colorsSection.classList.contains('open');
}

$('do-render').addEventListener('click', () => {
  const bundle: { type: string; md: string; colors?: { bg: string; fg: string } } = {
    type: 'render',
    md: ta.value,
  };
  if (isColorOverrideOn()) {
    bundle.colors = { bg: colors.bg, fg: colors.fg };
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
  if (m.type === 'theme') {
    // 패널이 현재 Figma 페이지 배경 판정을 따르도록 data-theme을 적용한다
    // (DESIGN.md 테마 모델). 메시지 도착 전에는 @media(prefers-color-scheme)가 대신 적용된다.
    document.documentElement.setAttribute('data-theme', m.theme);
  } else if (m.type === 'exported') {
    ta.value = m.md;
    ta.select();
    document.execCommand('copy');
    ta.selectionStart = ta.selectionEnd = ta.value.length;
    toast(m.warnings && m.warnings.length ? '경고(건너뜀):\n' + m.warnings.join('\n') : '내보냄 + 클립보드 복사 완료');
  } else if (m.type === 'error') {
    toast('오류: ' + m.message);
  }
};
