import fs from 'fs';
import path from 'path';

function walk(dir, ext, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules') walk(p, ext, out);
    else if (ext.some((x) => p.endsWith(x))) out.push(p);
  }
  return out;
}

const simpleLabels = fs.readFileSync('src/lib/i18n/simpleLabels.ts', 'utf8');
const allKeys = new Set();
for (const m of simpleLabels.matchAll(/^\s+([a-zA-Z0-9_.]+):\s+bi\(/gm)) allKeys.add(m[1]);
for (const m of simpleLabels.matchAll(/'([^']+)':\s+bi\(/g)) allKeys.add(m[1]);

const srcFiles = walk('src', ['.ts', '.tsx']);
const usedKeys = new Set();
const patterns = [
  /\bt\(['"]([^'"]+)['"]\)/g,
  /\blabel\(['"]([^'"]+)['"]\)/g,
  /\btf\(['"]([^'"]+)['"]\)/g,
  /getLabel\(['"]([^'"]+)['"]/g,
  /uiError\(['"]([^'"]+)['"]/g,
  /formatMessage\(['"]([^'"]+)['"]/g,
];

for (const f of srcFiles) {
  if (f.includes('simpleLabels.ts')) continue;
  const c = fs.readFileSync(f, 'utf8');
  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(c))) usedKeys.add(m[1]);
  }
}

const unused = [...allKeys].filter((k) => !usedKeys.has(k)).sort();
const missing = [...usedKeys].filter((k) => !allKeys.has(k)).sort();

const hardcoded = [];
const jsxTextRe = />([^<{][^<]*?)</g;
const skipPatterns = [
  /^\s*$/,
  /^[\d\s.,:;|+\-/%$LKR]+$/,
  /^[—–-]+$/,
  /^[&][a-z]+;$/,
];

for (const f of srcFiles) {
  if (
    f.includes('simpleLabels.ts') ||
    f.includes('dictionaries/') ||
    f.includes('seedDemoData') ||
    f.includes('vite-env')
  )
    continue;
  const c = fs.readFileSync(f, 'utf8');
  if (!c.includes('tsx') && !f.endsWith('.tsx')) continue;
  let m;
  jsxTextRe.lastIndex = 0;
  while ((m = jsxTextRe.exec(c))) {
    const text = m[1].trim();
    if (text.length < 2) continue;
    if (skipPatterns.some((p) => p.test(text))) continue;
    if (/^[A-Za-z0-9_\-./@]+$/.test(text) && !/[a-z].*[A-Z]|[A-Z].*\s/.test(text))
      continue;
    if (/[\u0D80-\u0DFF]/.test(text) || /[A-Za-z]{2,}/.test(text)) {
      const line = c.slice(0, m.index).split('\n').length;
      hardcoded.push({ file: f.replace(/\\/g, '/'), line, text: text.slice(0, 80) });
    }
  }
}

console.log(JSON.stringify({
  filesScanned: srcFiles.length,
  labelKeys: allKeys.size,
  usedKeys: usedKeys.size,
  unusedCount: unused.length,
  missingCount: missing.length,
  missing,
  unused: unused.slice(0, 80),
  hardcodedSample: hardcoded.slice(0, 120),
  hardcodedCount: hardcoded.length,
}, null, 2));
