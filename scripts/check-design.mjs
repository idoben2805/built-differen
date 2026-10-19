#!/usr/bin/env node
// Design guardrail: scans js/app.js, index.html and css/*.css for design-system violations
// (hard-coded colors, Tailwind color/arbitrary utilities, emojis, forced overrides, inline styles,
// raw font-size/border-radius values). Allowed colors come from css/tokens.css if present,
// otherwise from the :root block(s) in css/styles.css.
// Usage: node scripts/check-design.mjs [--json] [--max=N] [--update-baseline]
// Opt out a region with `/* design-check:off */` ... `/* design-check:on */` (or <!-- --> in HTML).
// Exit 0 if no violations; with scripts/design-baseline.json, exit 1 only if any count went UP.
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = join(ROOT, 'scripts', 'design-baseline.json');
const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const UPDATE = args.includes('--update-baseline');
const MAX = Number((args.find(a => a.startsWith('--max=')) || '--max=5').slice(6)) || 5;

const rel = p => p.replace(/\\/g, '/').replace(ROOT.replace(/\\/g, '/') + '/', '');
const cssDir = join(ROOT, 'css');
const cssFiles = existsSync(cssDir) ? readdirSync(cssDir).filter(f => f.endsWith('.css')).sort().map(f => join(cssDir, f)) : [];
const files = [join(ROOT, 'js', 'app.js'), join(ROOT, 'index.html'), ...cssFiles].filter(existsSync);
const hasTokens = existsSync(join(cssDir, 'tokens.css'));
const isTokenFile = f => hasTokens && f.endsWith('tokens.css');

const RULES = {
  'hard-coded-colors': 'Hard-coded colors (hex/rgb/hsl) outside token source',
  'tailwind-colors': 'Tailwind color utilities / arbitrary values',
  'emojis': 'Emojis / pictographic characters (app.js, index.html)',
  'forced-overrides': '!important and Tailwind !-prefixed utilities',
  'inline-styles': 'Inline style attributes (app.js, index.html)',
  'raw-css-values': 'Raw font-size / border-radius values in CSS',
};
const found = Object.fromEntries(Object.keys(RULES).map(k => [k, []]));
const add = (rule, file, line, text, col) => {
  const t = text.trimStart(); const off = text.length - t.length;
  const start = Math.max(0, col - off - 30);
  found[rule].push({ file: rel(file), line, snippet: t.slice(start, start + 100).trimEnd() });
};

// Line numbers inside :root { } blocks (brace-depth tracked); css comments must already be blanked.
function rootLines(text) {
  const set = new Set(); let line = 1, depth = 0, inRoot = false, rootDepth = 0;
  const re = /:root\b[^{}]*\{|[{}\n]/g; let m;
  while ((m = re.exec(text))) {
    if (m[0] === '\n') { line++; if (inRoot) set.add(line); continue; }
    if (m[0] === '}') { depth--; if (inRoot && depth < rootDepth) inRoot = false; continue; }
    if (m[0] !== '{' && !inRoot) { inRoot = true; rootDepth = depth + 1; set.add(line); }
    depth++;
  }
  return set;
}

const COLOR_NAMES = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black';
const TW_COLOR = new RegExp(`(?<![\\w-])!?(?:[a-z0-9-]+:)*(?:text|bg|border|from|to|via|ring|fill|stroke|divide|placeholder)-(?:${COLOR_NAMES})(?:-\\d{2,3})?(?:/\\d+)?(?![\\w-])`, 'g');
const TW_ARB = /(?<![\w-])!?(?:[a-z0-9-]+:)*[a-z]+(?:-[a-z]+)*-\[[^\]\s'"`]+\]/g;
const HEX = /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const FUNC_COLOR = /(?<![\w-])(?:rgba?|hsla?)\(/g;
const EMOJI = /\p{Extended_Pictographic}(?:️|⃣|\p{Emoji_Modifier}|‍\p{Extended_Pictographic})*/gu;
const TW_BANG = /(?<![\w$.])!(?:[a-z0-9]+:)*(?:-?[a-z]+(?:-[\w/.%\[\]#]+)+|hidden|flex|block|grid|inline|contents)(?![\w-])/g;
const INLINE_STYLE = /(?<![\w-])style\s*=\s*["'`]/g;
const RAW_VAL = /(font-size|border(?:-(?:top|bottom|start|end)-(?:left|right|start|end))?-radius)\s*:\s*([^;}\n]+)/g;

function scanAll(re, line, fn) { re.lastIndex = 0; let m; while ((m = re.exec(line))) fn(m); }

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const isCss = file.endsWith('.css'), isApp = file.endsWith('app.js'), isHtml = file.endsWith('.html');
  const rawLines = raw.split(/\r?\n/);
  // opt-out regions (marker lines themselves are skipped)
  const off = new Array(rawLines.length).fill(false); let state = false;
  rawLines.forEach((l, i) => {
    if (/design-check:off/.test(l)) { state = true; off[i] = true; }
    else if (/design-check:on/.test(l)) { state = false; off[i] = true; }
    else off[i] = state;
  });
  // blank CSS comments (keep newlines) so commented-out values are not flagged
  const text = isCss ? raw.replace(/\/\*[\s\S]*?\*\//g, c => c.replace(/[^\n]/g, ' ')) : raw;
  const lines = text.split(/\r?\n/);
  // null = whole file is the token source; Set = lines of :root blocks that are the token source
  const tokenSkip = isTokenFile(file) ? null : (isCss && !hasTokens && file.endsWith('styles.css') ? rootLines(text) : new Set());

  lines.forEach((line, i) => {
    if (off[i]) return;
    const n = i + 1;
    const inTokens = tokenSkip === null || tokenSkip.has(n);
    if (!inTokens) {
      scanAll(HEX, line, m => add('hard-coded-colors', file, n, line, m.index));
      scanAll(FUNC_COLOR, line, m => add('hard-coded-colors', file, n, line, m.index));
    }
    if (isApp || isHtml) {
      scanAll(TW_COLOR, line, m => add('tailwind-colors', file, n, line, m.index));
      scanAll(TW_ARB, line, m => add('tailwind-colors', file, n, line, m.index));
      scanAll(EMOJI, line, m => add('emojis', file, n, line, m.index));
      scanAll(TW_BANG, line, m => add('forced-overrides', file, n, line, m.index));
      scanAll(INLINE_STYLE, line, m => add('inline-styles', file, n, line, m.index));
    }
    if (isCss) {
      scanAll(/!\s*important/g, line, m => add('forced-overrides', file, n, line, m.index));
      if (!inTokens) scanAll(RAW_VAL, line, m => {
        if (/\d*\.?\d+(?:px|rem|em)\b/.test(m[2]) && !/^\s*var\(/.test(m[2])) add('raw-css-values', file, n, line, m.index);
      });
    }
  });
}

const counts = Object.fromEntries(Object.keys(RULES).map(k => [k, found[k].length]));
const total = Object.values(counts).reduce((a, b) => a + b, 0);
const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')).counts || {} : null;
const worse = [], better = [];
if (baseline) for (const k of Object.keys(RULES)) {
  const b = baseline[k] ?? 0;
  if (counts[k] > b) worse.push({ rule: k, baseline: b, now: counts[k] });
  else if (counts[k] < b) better.push({ rule: k, baseline: b, now: counts[k] });
}
if (UPDATE) writeFileSync(BASELINE, JSON.stringify({ counts }, null, 2) + '\n');
const fail = !UPDATE && (baseline ? worse.length > 0 : total > 0);
const NOTE = 'Wrap the exercise SVG thumbnail generator region in js/app.js with /* design-check:off */ ... /* design-check:on */ to exclude it.';

if (JSON_OUT) {
  const rules = Object.fromEntries(Object.keys(RULES).map(k => [k, { description: RULES[k], count: counts[k], examples: found[k].slice(0, MAX) }]));
  console.log(JSON.stringify({ total, counts, baseline, regressions: worse, improvements: better, note: NOTE, rules }, null, 2));
} else {
  const pad = (s, w) => String(s).padEnd(w);
  console.log('Design check summary');
  console.log(pad('rule', 22) + pad('count', 8) + (baseline ? 'baseline' : ''));
  for (const k of Object.keys(RULES)) console.log(pad(k, 22) + pad(counts[k], 8) + (baseline ? (baseline[k] ?? 0) : ''));
  console.log(pad('TOTAL', 22) + total + '\n');
  for (const k of Object.keys(RULES)) {
    console.log(`== ${k}: ${counts[k]} (${RULES[k]})`);
    found[k].slice(0, MAX).forEach(e => console.log(`  ${e.file}:${e.line}  ${e.snippet}`));
    if (counts[k] > MAX) console.log(`  ... ${counts[k] - MAX} more`);
  }
  console.log('\nNote: ' + NOTE);
  if (baseline) {
    better.forEach(b => console.log(`IMPROVED  ${b.rule}: ${b.baseline} -> ${b.now}`));
    worse.forEach(b => console.log(`REGRESSED ${b.rule}: ${b.baseline} -> ${b.now}`));
  }
  if (UPDATE) console.log('Baseline written to ' + rel(BASELINE));
  else console.log(fail ? 'FAIL' : 'OK');
}
process.exit(fail ? 1 : 0);
