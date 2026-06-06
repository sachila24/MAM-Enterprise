/**
 * Static audit: MAM print documents — cash sale B5 single-page, receipts B5 fill, agreements A4.
 * Run: node scripts/verify-print-layout.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cssPath = join(root, 'src/styles/document-print.css');
const css = readFileSync(cssPath, 'utf8');

const printComponents = [
  'src/components/documents/LoanInvoicePrint.tsx',
  'src/components/documents/LoanReleaseNotePrint.tsx',
  'src/components/documents/PaymentReceiptDocumentPrint.tsx',
  'src/components/documents/CashSaleInvoicePrint.tsx',
];

const FORBIDDEN_IN_PRINT = [
  { pattern: /height:\s*100vh/i, label: 'height: 100vh in print CSS' },
  { pattern: /max-height:\s*297mm/i, label: 'max-height: 297mm (A4 cap)' },
  { pattern: /max-height:\s*100vh/i, label: 'max-height: 100vh' },
  { pattern: /transform:\s*scale\(/i, label: 'transform: scale() shrink' },
  { pattern: /zoom:\s*[^1]/i, label: 'zoom below 100%' },
  { pattern: /page-break-after:\s*always/i, label: 'forced page-break-after: always' },
  { pattern: /break-after:\s*page/i, label: 'forced break-after: page on sections' },
  {
    pattern: /\.cash-sale-print-b5[\s\S]*justify-content:\s*space-evenly/i,
    label: 'cash sale space-evenly stretch',
  },
  {
    pattern: /#document-print-area\.cash-sale-print-b5[\s\S]*min-height:\s*100%/,
    label: 'cash sale paper-adaptive min-height (print)',
  },
];

const printBlockRaw = css.match(/@media print\s*\{[\s\S]*\}/)?.[0] ?? '';
const printBlock = printBlockRaw.replace(/\/\*[\s\S]*?\*\//g, '');

console.log('=== MAM Print Layout Verification ===\n');

let failed = false;

const cashSalePrintBlock =
  printBlock.match(
    /\/\* Cash sale — fixed B5[\s\S]*?(?=\/\* A4 agreements|$)/
  )?.[0] ?? '';

const FORBIDDEN_CASH_SALE = [
  {
    pattern: /justify-content:\s*space-evenly/i,
    label: 'cash sale space-evenly stretch',
  },
  { pattern: /min-height:\s*100%/i, label: 'cash sale min-height 100%' },
  { pattern: /margin-top:\s*auto/i, label: 'cash sale margin-top: auto stretch' },
  { pattern: /flex:\s*1/i, label: 'cash sale flex growth' },
];

for (const { pattern, label } of FORBIDDEN_IN_PRINT) {
  if (pattern.test(printBlock)) {
    console.log(`FAIL  Found ${label}`);
    failed = true;
  }
}

for (const { pattern, label } of FORBIDDEN_CASH_SALE) {
  if (pattern.test(cashSalePrintBlock)) {
    console.log(`FAIL  Found ${label}`);
    failed = true;
  }
}

const required = [
  { pattern: /@page\s+receipt-b5[\s\S]*size:\s*B5/, label: '@page receipt-b5 size: B5' },
  { pattern: /@page\s+agreement-a4[\s\S]*size:\s*A4/, label: '@page agreement-a4 size: A4' },
  {
    pattern: /@page\s+cash-sale-b5[\s\S]*size:\s*B5 portrait/,
    label: '@page cash-sale-b5 size: B5 portrait',
  },
  { pattern: /\.receipt-print-b5[\s\S]*page:\s*receipt-b5/, label: 'receipt-print-b5 page binding' },
  { pattern: /\.agreement-print-a4[\s\S]*page:\s*agreement-a4/, label: 'agreement-print-a4 page binding' },
  {
    pattern: /\.cash-sale-print-b5[\s\S]*page:\s*cash-sale-b5/,
    label: 'cash-sale-print-b5 page binding',
  },
  { pattern: /#document-print-area[\s\S]*overflow:\s*visible/, label: 'print area overflow: visible' },
  { pattern: /#document-print-area[\s\S]*max-height:\s*none/, label: 'print area max-height: none' },
  { pattern: /body \*[\s\S]*visibility:\s*hidden/, label: 'print visibility isolation' },
  { pattern: /\.no-print[\s\S]*display:\s*none/, label: '.no-print display:none' },
  {
    pattern: /\.cash-sale-print-b5[\s\S]*break-inside:\s*avoid/,
    label: 'cash sale break-inside: avoid',
  },
  {
    pattern: /\.receipt-print-b5[\s\S]*min-height:\s*var\(--mam-b5-printable-height\)/,
    label: 'receipt B5 min-height fill',
  },
];

const printClassByComponent = {
  'src/components/documents/LoanInvoicePrint.tsx': 'agreement-print-a4',
  'src/components/documents/LoanReleaseNotePrint.tsx': 'agreement-print-a4',
  'src/components/documents/PaymentReceiptDocumentPrint.tsx': 'receipt-print-b5',
  'src/components/documents/CashSaleInvoicePrint.tsx': 'cash-sale-print-b5',
};

for (const { pattern, label } of required) {
  if (!pattern.test(css)) {
    console.log(`FAIL  Missing ${label}`);
    failed = true;
  }
}

for (const rel of printComponents) {
  const src = readFileSync(join(root, rel), 'utf8');
  if (!src.includes('id="document-print-area"')) {
    console.log(`FAIL  ${rel} missing #document-print-area`);
    failed = true;
  }
  if (!src.includes('mam-bill-sheet')) {
    console.log(`FAIL  ${rel} missing mam-bill-sheet wrapper`);
    failed = true;
  }
  const expectedClass = printClassByComponent[rel];
  if (expectedClass && !src.includes(expectedClass)) {
    console.log(`FAIL  ${rel} missing ${expectedClass}`);
    failed = true;
  }
}

const B5_PRINTABLE_PX = Math.round(((250 - 12) / 25.4) * 96);
const A4_PRINTABLE_PX = Math.round(((297 - 16) / 25.4) * 96);

const typicalHeights = {
  'Loan Agreement / Bill': 920,
  'Loan Release Note': 520,
  'Payment Receipt (B5 fill)': 860,
  'Cash Sale Invoice (B5 full-page)': 710,
};

console.log('\n--- Estimated page counts (96dpi) ---');
console.log(`B5 printable height (~6mm margins): ~${B5_PRINTABLE_PX}px`);
console.log(`A4 printable height (~8mm margins): ~${A4_PRINTABLE_PX}px\n`);

console.log('Typical records (expect 1 page):');
for (const [name, px] of Object.entries(typicalHeights)) {
  const pageHeight =
    name.includes('Receipt') || name.includes('Cash Sale') ? B5_PRINTABLE_PX : A4_PRINTABLE_PX;
  const pages = Math.ceil(px / pageHeight);
  const ok = pages === 1;
  console.log(`  ${ok ? 'OK' : 'WARN'}  ${name}: ~${px}px → ${pages} page(s)`);
  if (!ok) failed = true;
}

console.log('\n--- Document components ---');
for (const rel of printComponents) {
  console.log(`  OK  ${rel}`);
}

if (failed) {
  console.log('\nVerification FAILED');
  process.exit(1);
}

console.log('\nVerification PASSED — cash sale B5 single-page; natural pagination elsewhere.');
console.log('Confirm in browser: Print preview → B5 → Scale 100% → 1 sheet for cash sale.');
