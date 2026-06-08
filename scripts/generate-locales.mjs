/**
 * One-off generator: extract app/document/receipt strings into locales/en.ts & si.ts
 * Run: node scripts/generate-locales.mjs
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();

function escapeTsString(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function parseBiEntries(content, startMarker, endMarker) {
  const start = content.indexOf(startMarker);
  const end = content.lastIndexOf(endMarker);
  if (start === -1) return [];
  const block = content.slice(start, end === -1 ? undefined : end + endMarker.length);
  const entries = [];
  const re =
    /(?:'([^']+)'|([a-zA-Z][a-zA-Z0-9_]*))\s*:\s*bi\(\s*'((?:\\'|[^'])*)'\s*,\s*'((?:\\'|[^'])*)'\s*\)/gs;
  let m;
  while ((m = re.exec(block))) {
    const key = m[1] ?? m[2];
    const en = m[3].replace(/\\'/g, "'");
    const si = m[4].replace(/\\'/g, "'");
    entries.push({ key, en, si });
  }
  return entries;
}

function parseDocumentPairs(content) {
  const start = content.indexOf('const pairs');
  const end = content.indexOf('};', start);
  const block = content.slice(start, end);
  const entries = [];
  const re =
    /([a-zA-Z][a-zA-Z0-9_]*)\s*:\s*\{[\s\S]*?en:\s*'((?:\\'|[^'])*)'[\s\S]*?si:\s*'((?:\\'|[^'])*)'[\s\S]*?\}/g;
  let m;
  while ((m = re.exec(block))) {
    entries.push({
      key: m[1],
      en: m[2].replace(/\\'/g, "'"),
      si: m[3].replace(/\\'/g, "'"),
    });
  }
  return entries;
}

function parseReceiptObject(content, constName) {
  const re = new RegExp(
    `const ${constName}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`,
    'm'
  );
  const m = content.match(re);
  if (!m) return [];
  const body = m[1];
  const entries = [];
  const lineRe = /^\s+([a-zA-Z][a-zA-Z0-9_]*):\s*'((?:\\'|[^'])*)',?\s*$/gm;
  let lm;
  while ((lm = lineRe.exec(body))) {
    entries.push({
      key: lm[1],
      value: lm[2].replace(/\\'/g, "'"),
    });
  }
  return entries;
}

function parsePaymentMethods(content) {
  const start = content.indexOf('PAYMENT_METHOD_LABELS');
  const block = content.slice(start);
  const entries = [];
  const re =
    /([A-Z_]+):\s*\{\s*en:\s*'((?:\\'|[^'])*)'\s*,\s*si:\s*'((?:\\'|[^'])*)'\s*\}/gs;
  let m;
  while ((m = re.exec(block))) {
    entries.push({
      key: m[1],
      en: m[2].replace(/\\'/g, "'"),
      si: m[3].replace(/\\'/g, "'"),
    });
  }
  return entries;
}

function emitObject(entries, valueKey) {
  const lines = entries.map(({ key, en, si, value }) => {
    const k = key.includes('.') || !/^[a-zA-Z_]/.test(key) ? `'${key}'` : key;
    const v = escapeTsString(value ?? (valueKey === 'en' ? en : si));
    return `  ${k}: '${v}',`;
  });
  return lines.join('\n');
}

const simplePath = path.join(root, 'src/lib/i18n/simpleLabels.ts');
const docPath = path.join(root, 'src/lib/i18n/documentLabels.ts');
const receiptPath = path.join(root, 'src/lib/i18n/receiptLabels.ts');

const simpleContent = fs.readFileSync(simplePath, 'utf8');
const docContent = fs.readFileSync(docPath, 'utf8');
const receiptContent = fs.readFileSync(receiptPath, 'utf8');

const appEntries = parseBiEntries(simpleContent, 'export const t = {', '} as const');
const docEntries = parseDocumentPairs(docContent);
const receiptEn = parseReceiptObject(receiptContent, 'RECEIPT_EN');
const receiptSi = parseReceiptObject(receiptContent, 'RECEIPT_SI');
const paymentMethods = parsePaymentMethods(receiptContent);

if (receiptEn.length !== receiptSi.length) {
  console.error('Receipt EN/SI key count mismatch', receiptEn.length, receiptSi.length);
  process.exit(1);
}

const receiptEntries = receiptEn.map((en) => {
  const si = receiptSi.find((s) => s.key === en.key);
  if (!si) throw new Error(`Missing SI for receipt key ${en.key}`);
  return { key: en.key, en: en.value, si: si.value };
});

console.log('Counts:', {
  app: appEntries.length,
  document: docEntries.length,
  receipt: receiptEntries.length,
  receiptPaymentMethods: paymentMethods.length,
});

const enApp = emitObject(appEntries, 'en');
const siApp = emitObject(appEntries, 'si');
const enDoc = emitObject(docEntries, 'en');
const siDoc = emitObject(docEntries, 'si');
const enReceipt = emitObject(receiptEntries, 'en');
const siReceipt = emitObject(receiptEntries, 'si');
const enPm = paymentMethods
  .map(({ key, en }) => `  ${key}: '${escapeTsString(en)}',`)
  .join('\n');
const siPm = paymentMethods
  .map(({ key, si }) => `  ${key}: '${escapeTsString(si)}',`)
  .join('\n');

const enFile = `/** English UI strings — app, document, and receipt catalogs. */
export const app = {
${enApp}
} as const;

export const document = {
${enDoc}
} as const;

export const receipt = {
${enReceipt}
} as const;

export const receiptPaymentMethods = {
${enPm}
} as const;

export type AppLabelKey = keyof typeof app;
export type DocumentLabelKey = keyof typeof document;
export type ReceiptLabelKey = keyof typeof receipt;
`;

const siFile = `/** Sinhala UI strings — app, document, and receipt catalogs. */
import type { AppLabelKey, DocumentLabelKey, ReceiptLabelKey } from './en';

export const app: Record<AppLabelKey, string> = {
${siApp}
};

export const document: Record<DocumentLabelKey, string> = {
${siDoc}
};

export const receipt: Record<ReceiptLabelKey, string> = {
${siReceipt}
};

export const receiptPaymentMethods: Record<
  keyof typeof import('./en').receiptPaymentMethods,
  string
> = {
${siPm}
};
`;

const localesDir = path.join(root, 'src/lib/i18n/locales');
fs.mkdirSync(localesDir, { recursive: true });
fs.writeFileSync(path.join(localesDir, 'en.ts'), enFile, 'utf8');
fs.writeFileSync(path.join(localesDir, 'si.ts'), siFile, 'utf8');

console.log('Wrote locales/en.ts and locales/si.ts');
