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

function extractSimpleLabelKeys(content) {
  const keys = new Set();
  for (const m of content.matchAll(/^\s+([a-zA-Z0-9_.]+):\s+bi\(/gm)) keys.add(m[1]);
  for (const m of content.matchAll(/'([^']+)':\s+bi\(/g)) keys.add(m[1]);
  return keys;
}

function extractDocLabelKeys(content) {
  const keys = new Set();
  for (const m of content.matchAll(/^\s+([a-zA-Z0-9_]+):\s+\{\s*en:/gm)) keys.add(m[1]);
  return keys;
}

function extractReceiptStringCount(content) {
  const enBlock = content.match(/const RECEIPT_EN[^=]*=\s*\{([\s\S]*?)\};/);
  if (!enBlock) return 0;
  return (enBlock[1].match(/:\s*'/g) || []).length;
}

const srcFiles = walk('src', ['.ts', '.tsx']);
const simpleLabels = fs.readFileSync('src/lib/i18n/simpleLabels.ts', 'utf8');
const docLabels = fs.readFileSync('src/lib/i18n/documentLabels.ts', 'utf8');
const receiptLabels = fs.readFileSync('src/lib/i18n/receiptLabels.ts', 'utf8');
const legacyEn = fs.readFileSync('src/i18n/dictionaries/en.ts', 'utf8');
const legacySi = fs.readFileSync('src/i18n/dictionaries/si.ts', 'utf8');

const allKeys = extractSimpleLabelKeys(simpleLabels);
const docKeys = extractDocLabelKeys(docLabels);
const legacyEnKeys = extractSimpleLabelKeys(legacyEn.replace(/export const en = \{/, '').replace(/bi\(/g, ': bi(')); // won't work
const legacyKeyRe = /'([^']+)':\s+'/g;
const legacyEnKeySet = new Set();
let m;
while ((m = legacyKeyRe.exec(legacyEn))) legacyEnKeySet.add(m[1]);
const legacySiKeySet = new Set();
legacyKeyRe.lastIndex = 0;
while ((m = legacyKeyRe.exec(legacySi))) legacySiKeySet.add(m[1]);

const overlapLegacy = [...legacyEnKeySet].filter((k) => allKeys.has(k));

const usedKeys = new Set();
const patterns = [
  /\bt\(['"]([^'"]+)['"]\)/g,
  /\blabel\(['"]([^'"]+)['"]\)/g,
  /\btf\(['"]([^'"]+)['"]\)/g,
  /getLabel\(['"]([^'"]+)['"]/g,
  /uiError\(['"]([^'"]+)['"]/g,
  /formatMessage\(['"]([^'"]+)['"]/g,
  /nameKey:\s*['"]([^'"]+)['"]/g,
  /labelKey:\s*['"]([^'"]+)['"]/g,
];
const enumKeyRefs = new Set();
for (const f of srcFiles) {
  if (f.includes('simpleLabels.ts')) continue;
  const c = fs.readFileSync(f, 'utf8');
  for (const re of patterns) {
    re.lastIndex = 0;
    let mm;
    while ((mm = re.exec(c))) usedKeys.add(mm[1]);
  }
  for (const mm of c.matchAll(/ENUM_LABEL_KEYS|formatEnum\(/g)) enumKeyRefs.add(f);
  for (const mm of c.matchAll(/getDocumentLabel\(['"]([^'"]+)['"]/g)) usedKeys.add('doc:' + mm[1]);
  for (const mm of c.matchAll(/getDocumentLabels\(\)/g)) {}
}

const unused = [...allKeys].filter((k) => !usedKeys.has(k)).sort();
const missing = [...usedKeys].filter((k) => !k.startsWith('doc:') && !allKeys.has(k)).sort();

// Files with Sinhala unicode
const sinhalaFiles = [];
const englishInTsx = [];
const usesT = new Set();
const noUseT_tsx = [];

const enStringRe = /(?:>|=\s*|title[=:]\s*|placeholder[=:]\s*|aria-label[=:]\s*['"])([A-Z][A-Za-z0-9 ,.&'/()-]{2,60})(?:<|['"])/g;

for (const f of srcFiles) {
  const rel = f.replace(/\\/g, '/');
  const c = fs.readFileSync(f, 'utf8');
  if (/[\u0D80-\u0DFF]/.test(c)) sinhalaFiles.push(rel);
  if (c.includes('useT(') || c.includes('useT ()')) usesT.add(rel);
  if (f.endsWith('.tsx') && !c.includes('useT(') && !c.includes('getLabel(') && !c.includes('getDocumentLabel')) {
    if (!rel.includes('ProtectedRoute') && !rel.includes('index.tsx') && !rel.includes('App.tsx'))
      noUseT_tsx.push(rel);
  }
}

for (const f of srcFiles.filter((x) => x.endsWith('.tsx'))) {
  const rel = f.replace(/\\/g, '/');
  if (
    rel.includes('simpleLabels') ||
    rel.includes('dictionaries/') ||
    rel.includes('seedDemoData')
  )
    continue;
  const c = fs.readFileSync(f, 'utf8');
  const hits = [];
  const jsxRe = />\s*([A-Za-z][A-Za-z0-9 ,.'()/–-]{2,50})\s*</g;
  let mm;
  while ((mm = jsxRe.exec(c))) {
    const text = mm[1].trim();
    if (/^(LKR|void|true|false|null)$/.test(text)) continue;
    if (/^\d/.test(text)) continue;
    hits.push(text);
  }
  if (hits.length > 0) englishInTsx.push({ file: rel, count: hits.length, samples: [...new Set(hits)].slice(0, 8) });
}
englishInTsx.sort((a, b) => b.count - a.count);

// Lib display files with English bi or strings
const libDisplayEn = srcFiles
  .filter((f) => f.includes('lib/display') || f.includes('lib/guarantee') || f.includes('ledgerAllocation'))
  .map((f) => f.replace(/\\/g, '/'));

// Duplicate keys - same English in bi() calls
const enToKeys = new Map();
for (const mm of simpleLabels.matchAll(/([a-zA-Z0-9_.]+):\s+bi\(\s*'([^']*)'/g)) {
  const key = mm[1];
  const en = mm[2];
  if (!enToKeys.has(en)) enToKeys.set(en, []);
  enToKeys.get(en).push(key);
}
for (const mm of simpleLabels.matchAll(/'([^']+)':\s+bi\(\s*'([^']*)'/g)) {
  const key = mm[1];
  const en = mm[2];
  if (!enToKeys.has(en)) enToKeys.set(en, []);
  enToKeys.get(en).push(key);
}
const duplicateEnglish = [...enToKeys.entries()]
  .filter(([, keys]) => keys.length > 1)
  .map(([en, keys]) => ({ en, keys, count: keys.length }))
  .sort((a, b) => b.count - a.count);

const dictFiles = [
  'src/lib/i18n/simpleLabels.ts',
  'src/lib/i18n/documentLabels.ts',
  'src/lib/i18n/receiptLabels.ts',
  'src/lib/i18n/sinhalaNaturalizer.ts',
  'src/i18n/dictionaries/en.ts',
  'src/i18n/dictionaries/si.ts',
  'src/i18n/dictionaries/ta.ts',
];

console.log(
  JSON.stringify(
    {
      summary: {
        srcFiles: srcFiles.length,
        simpleLabelKeys: allKeys.size,
        documentLabelKeys: docKeys.size,
        receiptLabelStrings: extractReceiptStringCount(receiptLabels),
        legacyEnKeys: legacyEnKeySet.size,
        legacySiKeys: legacySiKeySet.size,
        legacyOverlapWithSimpleLabels: overlapLegacy.length,
        usedKeys: usedKeys.size,
        unusedKeys: unused.length,
        missingKeys: missing.length,
        duplicateEnglishConcepts: duplicateEnglish.length,
        sinhalaFileCount: sinhalaFiles.length,
        tsxWithUseT: usesT.size,
        tsxWithoutUseT: noUseT_tsx.length,
        jsxHardcodedEnglishFiles: englishInTsx.length,
        totalJsxHardcodedSnippets: englishInTsx.reduce((s, x) => s + x.count, 0),
      },
      dictionaryFiles: dictFiles,
      sinhalaFiles,
      legacyOverlapKeys: overlapLegacy,
      tsxWithoutUseT: noUseT_tsx,
      topHardcodedJsx: englishInTsx.slice(0, 35),
      topDuplicateEnglish: duplicateEnglish.slice(0, 25),
      libDisplayPaths: libDisplayEn,
      unusedSample: unused.slice(0, 40),
      missing,
    },
    null,
    2
  )
);
