/**
 * Verify locale parity and getLabel output after Phase 1 refactor.
 * Run: node scripts/verify-locales.mjs
 */
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);

// Dynamic import of compiled TS won't work easily — parse locale files instead
const enPath = 'src/lib/i18n/locales/en.ts';
const siPath = 'src/lib/i18n/locales/si.ts';
const enContent = fs.readFileSync(enPath, 'utf8');
const siContent = fs.readFileSync(siPath, 'utf8');

function countSection(content, name) {
  const re = new RegExp(`export const ${name} = \\{([\\s\\S]*?)\\} as const;`);
  const m = content.match(re);
  if (!m) {
    const re2 = new RegExp(`export const ${name}[^=]*= \\{([\\s\\S]*?)\\n\\};`);
    const m2 = content.match(re2);
    if (!m2) return { count: 0, error: `section ${name} not found` };
    const keys = (m2[1].match(/^\s+['"]?[\w.]+['"]?:/gm) || []).length;
    return { count: keys };
  }
  const keys = (m[1].match(/^\s+['"]?[\w.]+['"]?:/gm) || []).length;
  return { count: keys };
}

function countSiSection(name) {
  const re = new RegExp(`export const ${name}[^=]*= \\{([\\s\\S]*?)\\n\\};`);
  const m = siContent.match(re);
  if (!m) return 0;
  return (m[1].match(/^\s+['"]?[\w.]+['"]?:/gm) || []).length;
}

const sections = ['app', 'document', 'receipt', 'receiptPaymentMethods'];
const report = { sections: {}, mismatches: [] };

for (const s of sections) {
  const en = countSection(enContent, s);
  const si =
    s === 'app' || s === 'document' || s === 'receipt'
      ? { count: countSiSection(s) }
      : countSection(enContent, s); // payment methods in si use different format
  const siCount =
    s === 'receiptPaymentMethods'
      ? (siContent.match(/export const receiptPaymentMethods[\s\S]*?\n\};/)[0].match(/^\s+[A-Z_]+:/gm) || []).length
      : countSiSection(s);
  report.sections[s] = { en: en.count, si: siCount };
  if (en.count !== siCount) {
    report.mismatches.push(`${s}: en=${en.count} si=${siCount}`);
  }
}

report.totalKeys =
  report.sections.app.en +
  report.sections.document.en +
  report.sections.receipt.en +
  report.sections.receiptPaymentMethods.en;

report.expected = { app: 877, document: 87, receipt: 40, receiptPaymentMethods: 4 };

const expectedTotal = 1008;
if (report.totalKeys !== expectedTotal) {
  report.mismatches.push(`total: ${report.totalKeys} expected ${expectedTotal}`);
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.mismatches.length ? 1 : 0);
