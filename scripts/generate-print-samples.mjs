/**
 * Generates sample print HTML files for manual PDF export (Print → Save as PDF).
 * Run: node scripts/generate-print-samples.mjs
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist', 'print-samples');
mkdirSync(outDir, { recursive: true });

const cssContent = readFileSync(join(root, 'src/styles/document-print.css'), 'utf8');

function headerHtml(title) {
  return `
<header class="mam-bill-header mam-bill-header-split">
  <div class="mam-bill-header-row">
    <div class="mam-bill-header-brand"><div style="width:52px;height:52px;border:2px solid #1e3a5f;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#1e3a5f">MAM</div></div>
    <div class="mam-bill-header-info">
      <h1 class="mam-bill-company">MAM TRADING</h1>
      <p class="mam-bill-company-line">No.47, Galmaduwa, Mahailuppallama</p>
      <p class="mam-bill-company-line">දුරකථන: 071 593 1681 | 071 209 9416</p>
    </div>
  </div>
  <p class="mam-bill-title">${title}</p>
</header>`;
}

const footerHtml = `
<footer class="mam-bill-footer">
  <p>System Developed &amp; Maintained by Sachila Dissanayake</p>
  <p>Contact: 0764608628 | sathmika7@gmail.com</p>
</footer>`;

function wrap(title, bodyClass, body) {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>${cssContent}</style>
</head>
<body>
<div id="document-print-area" class="receipt-document mam-bill ${bodyClass}">
<div class="receipt-sheet mam-bill-sheet">
${headerHtml(title)}
${body}
${footerHtml}
</div>
</div>
</body></html>`;
}

const samples = {
  'loan-invoice-typical.html': wrap(
    'Loan Agreement / Bill',
    'doc-invoice',
    `<div class="receipt-body mam-bill-body">
<section class="mam-bill-section"><h2 class="mam-bill-section-heading">Customer Details</h2>
<div class="mam-bill-detail-block"><div class="mam-bill-detail-row"><span class="mam-bill-detail-label">Name</span><span class="mam-bill-detail-value">Sample Customer</span></div></div></section>
<section class="mam-bill-section mam-bill-finance"><h2 class="mam-bill-section-heading">Finance Details</h2>
<div class="mam-bill-finance-box"><div class="mam-bill-row"><span class="mam-bill-row-label">Total Payable</span><span class="mam-bill-row-leader"></span><span class="mam-bill-row-value">LKR 500,000</span></div></div></section>
<section class="mam-bill-section"><h2 class="mam-bill-section-heading">Guarantor Details</h2>
<div class="mam-bill-detail-block mam-bill-guarantor-block"><p class="mam-bill-guarantor-heading">Guarantor 1</p>
<div class="mam-bill-detail-row"><span class="mam-bill-detail-label">Name</span><span class="mam-bill-detail-value">Guarantor Name</span></div></div></section>
<p class="mam-bill-locked">This document is locked.</p>
<div class="mam-bill-signatures"><div class="mam-bill-sig"><div class="mam-bill-sig-line"></div><span>Customer</span></div><div class="mam-bill-sig"><div class="mam-bill-sig-line"></div><span>Guarantor</span></div><div class="mam-bill-sig"><div class="mam-bill-sig-line"></div><span>Officer</span></div></div>
</div>`
  ),
  'payment-receipt.html': wrap(
    'Payment Receipt',
    'mam-bill-payment-receipt',
    `<div class="receipt-body mam-bill-body">
<section class="mam-bill-section"><div class="mam-bill-duo-grid">
<div class="mam-bill-duo-col"><h2 class="mam-bill-section-heading">Customer</h2><div class="mam-bill-finance-box"><div class="mam-bill-row"><span class="mam-bill-row-label">Name</span><span class="mam-bill-row-leader"></span><span class="mam-bill-row-value">Sample</span></div></div></div>
<div class="mam-bill-duo-col"><h2 class="mam-bill-section-heading">Loan</h2><div class="mam-bill-finance-box"><div class="mam-bill-row"><span class="mam-bill-row-label">Loan No.</span><span class="mam-bill-row-leader"></span><span class="mam-bill-row-value">LN-001</span></div></div></div>
</div></section>
<section class="mam-bill-section"><h2 class="mam-bill-section-heading">Payment</h2>
<div class="mam-bill-finance-box"><div class="mam-bill-row"><span class="mam-bill-row-label">Paid</span><span class="mam-bill-row-leader"></span><span class="mam-bill-row-value">LKR 25,000</span></div></div></section>
<p class="mam-bill-locked">Locked notice.</p>
<div class="mam-bill-signatures mam-bill-signatures-two"><div class="mam-bill-sig"><div class="mam-bill-sig-line"></div><span>Customer</span></div><div class="mam-bill-sig"><div class="mam-bill-sig-line"></div><span>Officer</span></div></div>
</div>`
  ),
  'cash-sale.html': wrap(
    'Cash Sale Invoice',
    '',
    `<div class="receipt-body mam-bill-body">
<section class="mam-bill-section"><h2 class="mam-bill-section-heading">Bike</h2>
<div class="mam-bill-detail-block"><div class="mam-bill-detail-row"><span class="mam-bill-detail-label">Model</span><span class="mam-bill-detail-value">Honda CB</span></div></div></section>
<div class="mam-bill-signatures mam-bill-signatures-two"><div class="mam-bill-sig"><div class="mam-bill-sig-line"></div><span>Customer</span></div><div class="mam-bill-sig"><div class="mam-bill-sig-line"></div><span>Officer</span></div></div>
</div>`
  ),
};

for (const [name, html] of Object.entries(samples)) {
  const path = join(outDir, name);
  writeFileSync(path, html, 'utf8');
  console.log('Wrote', path);
}

console.log('\nOpen in Chrome → Print → Save as PDF at 100% scale.');
console.log('Turn OFF "Headers and footers" to hide browser URL/date margins.');
