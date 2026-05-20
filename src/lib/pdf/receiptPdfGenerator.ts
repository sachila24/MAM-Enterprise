import { jsPDF } from 'jspdf';
import sinhalaBoldFontUrl from '@expo-google-fonts/noto-sans-sinhala/700Bold/NotoSansSinhala_700Bold.ttf?url';
import sinhalaRegularFontUrl from '@expo-google-fonts/noto-sans-sinhala/400Regular/NotoSansSinhala_400Regular.ttf?url';
import { formatLKR } from '../format';
import {
  formatReceiptPaymentMethod,
  getReceiptLabels,
} from '../i18n/receiptLabels';
import type { DisplayMode } from '../i18n/simpleLabels';
import {
  buildReceiptPrintInsight,
  formatReceiptInsightDate,
  type ReceiptPrintInsightInput,
} from '../receipt/receiptPrintInsight';
import type {
  FixedInstallmentReceiptBreakdown,
  InterestOnlyReceiptBreakdown,
} from '../finance/receipt';
import type { RepaymentMethod } from '../../types/loan';

type JsPdfInstance = InstanceType<typeof jsPDF>;

export type ReceiptPdfPageMode = 'a4' | 'thermal80';
export type ReceiptPdfLanguageOrder = 'english-first' | 'sinhala-first';

export interface ReceiptPartyData {
  name: string;
  code?: string;
  phone?: string;
  address?: string;
  nic?: string;
}

export interface ReceiptLoanData {
  loanNo: string;
  type?: string;
  repaymentMethod?: string;
}

export interface ReceiptPaymentData {
  cashReceived: number;
  discountGiven?: number;
  totalApplied?: number;
  method?: string;
  reference?: string;
}

export interface ReceiptAllocationBreakdown {
  lateFees?: number;
  installments?: number;
  arrears?: number;
  principal?: number;
}

export interface ReceiptBalanceData {
  loanBalanceAfterPayment: number;
  arrearsRemaining?: number;
  principalBalanceAfter?: number;
}

export interface ReceiptBusinessData {
  name?: string;
  address?: string;
  phone?: string;
}

export interface PaymentReceiptData {
  receiptNumber: string;
  date: string | Date;
  customer: ReceiptPartyData;
  loan: ReceiptLoanData;
  payment: ReceiptPaymentData;
  allocation: ReceiptAllocationBreakdown;
  balance: ReceiptBalanceData;
  company?: ReceiptBusinessData;
  /** Display-only fields from payment-time snapshot */
  printInsight?: ReceiptPrintInsightInput;
  advancePayment?: number;
}

export interface ReceiptPdfOptions {
  pageMode?: ReceiptPdfPageMode;
  languageOrder?: ReceiptPdfLanguageOrder;
  displayMode?: DisplayMode;
  filename?: string;
}

interface Layout {
  pageMode: ReceiptPdfPageMode;
  pageSize: 'a4' | [number, number];
  width: number;
  height: number;
  margin: number;
  padding: number;
  receiptWidth: number;
  fontBody: number;
  fontSmall: number;
  fontHeader: number;
  fontTitle: number;
}

const FONT_REGULAR = 'NotoSansSinhalaReceipt';
const FONT_BOLD = 'NotoSansSinhalaReceiptBold';
const FONT_REGULAR_FILE = 'NotoSansSinhalaReceipt-Regular.ttf';
const FONT_BOLD_FILE = 'NotoSansSinhalaReceipt-Bold.ttf';
let fontLoadPromise: Promise<{ regular: string; bold: string }> | null = null;

const MM_PER_INCH = 25.4;
const POINTS_PER_INCH = 72;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const THERMAL_WIDTH_MM = 80;
const THERMAL_HEIGHT_MM = 260;

export async function generateReceiptPdf(
  data: PaymentReceiptData,
  options: ReceiptPdfOptions = {}
): Promise<JsPdfInstance> {
  const layout = createLayout(options.pageMode ?? 'a4');
  const doc = new jsPDF({
    unit: 'mm',
    format: layout.pageSize,
    orientation: 'portrait',
    compress: true,
    putOnlyUsedFonts: true,
  });

  await ensureReceiptFonts(doc);
  const displayMode =
    options.displayMode ??
    (options.languageOrder === 'english-first' ? 'en' : 'si');
  renderReceipt(doc, data, layout, displayMode);
  return doc;
}

export async function generateReceiptPdfBlob(
  data: PaymentReceiptData,
  options: ReceiptPdfOptions = {}
): Promise<Blob> {
  const doc = await generateReceiptPdf(data, options);
  return doc.output('blob');
}

export async function downloadReceiptPdf(
  data: PaymentReceiptData,
  options: ReceiptPdfOptions = {}
): Promise<void> {
  const doc = await generateReceiptPdf(data, options);
  doc.save(options.filename ?? receiptFilename(data));
}

export async function printReceiptPdf(
  data: PaymentReceiptData,
  options: ReceiptPdfOptions = {}
): Promise<void> {
  const doc = await generateReceiptPdf(data, options);
  doc.autoPrint({ variant: 'non-conform' });

  const blobUrl = URL.createObjectURL(doc.output('blob'));
  const printWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    throw new Error('Could not open print window. Please allow pop-ups.');
  }

  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export const RECEIPT_PDF_TEST_CASES: Record<string, PaymentReceiptData> = {
  normalPayment: {
    receiptNumber: 'RC-2026-0001',
    date: '2026-05-10',
    customer: {
      name: 'Malinga Randunu',
      code: 'CUS-0001',
      phone: '077 123 4567',
      nic: '901234567V',
    },
    loan: {
      loanNo: 'LN-FIX-0002',
      type: 'Fixed monthly installments',
      repaymentMethod: 'FIXED_MONTHLY_INSTALLMENT',
    },
    payment: {
      cashReceived: 25_000,
      totalApplied: 25_000,
      method: 'CASH',
    },
    allocation: {
      lateFees: 0,
      installments: 25_000,
      arrears: 0,
      principal: 0,
    },
    balance: {
      loanBalanceAfterPayment: 175_000,
    },
  },
  paymentWithDiscount: {
    receiptNumber: 'RC-2026-0002',
    date: '2026-05-10',
    customer: {
      name: 'Nuwan Perera',
      code: 'CUS-0002',
      phone: '071 555 8800',
    },
    loan: {
      loanNo: 'LN-FIX-0008',
      type: 'Bike installment',
      repaymentMethod: 'FIXED_TERM_INSTALLMENT',
    },
    payment: {
      cashReceived: 20_000,
      discountGiven: 5_000,
      totalApplied: 25_000,
      method: 'CASH',
    },
    allocation: {
      lateFees: 0,
      installments: 25_000,
      arrears: 0,
      principal: 0,
    },
    balance: {
      loanBalanceAfterPayment: 150_000,
    },
  },
  fullSettlement: {
    receiptNumber: 'RC-2026-0003',
    date: '2026-05-10',
    customer: {
      name: 'Kasun Silva',
      code: 'CUS-0003',
      phone: '075 222 1111',
    },
    loan: {
      loanNo: 'LN-IO-0012',
      type: 'Interest only',
      repaymentMethod: 'INTEREST_ONLY',
    },
    payment: {
      cashReceived: 112_000,
      discountGiven: 3_000,
      totalApplied: 115_000,
      method: 'CASH',
    },
    allocation: {
      lateFees: 0,
      installments: 0,
      arrears: 15_000,
      principal: 100_000,
    },
    balance: {
      loanBalanceAfterPayment: 0,
      principalBalanceAfter: 0,
    },
  },
  lateFeePayment: {
    receiptNumber: 'RC-2026-0004',
    date: '2026-05-10',
    customer: {
      name: 'Dilani Jayasekara',
      code: 'CUS-0004',
      phone: '076 444 7711',
    },
    loan: {
      loanNo: 'LN-FIX-0015',
      type: 'Fixed monthly installments',
      repaymentMethod: 'FIXED_MONTHLY_INSTALLMENT',
    },
    payment: {
      cashReceived: 30_000,
      totalApplied: 30_000,
      method: 'CASH',
    },
    allocation: {
      lateFees: 2_500,
      installments: 22_500,
      arrears: 5_000,
      principal: 0,
    },
    balance: {
      loanBalanceAfterPayment: 95_000,
      arrearsRemaining: 0,
    },
    printInsight: {
      balanceBefore: 125_000,
      nextInstallmentDate: '2026-06-10',
      currentMonthDue: 22_500,
      currentMonthPaid: 22_500,
      lateFeesDueBefore: 2_500,
    },
  },
};

export async function generateReceiptPdfTestBlobs(
  options: ReceiptPdfOptions = {}
): Promise<Record<keyof typeof RECEIPT_PDF_TEST_CASES, Blob>> {
  const entries = await Promise.all(
    Object.entries(RECEIPT_PDF_TEST_CASES).map(async ([key, data]) => [
      key,
      await generateReceiptPdfBlob(data, options),
    ])
  );

  return Object.fromEntries(entries) as Record<
    keyof typeof RECEIPT_PDF_TEST_CASES,
    Blob
  >;
}

function formatPdfDateTime(
  dateInput: string | Date
): { date: string; time: string } {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    return { date: '—', time: '—' };
  }
  return {
    date: d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  };
}

function renderReceipt(
  doc: JsPdfInstance,
  data: PaymentReceiptData,
  layout: Layout,
  displayMode: DisplayMode
): void {
  const labels = getReceiptLabels(displayMode);
  const receiptX = (layout.width - layout.receiptWidth) / 2;
  const contentX = receiptX + layout.padding;
  const contentWidth = layout.receiptWidth - layout.padding * 2;
  const footerY = layout.height - layout.margin - 16;
  let y = layout.margin + layout.padding;

  setFont(doc, 'bold', layout.fontHeader);
  doc.text(data.company?.name ?? 'M A M TRADING', layout.width / 2, y, {
    align: 'center',
  });
  y += 6;

  setFont(doc, 'normal', layout.fontSmall);
  const address = data.company?.address ?? 'කොළඹ';
  doc.text(address, layout.width / 2, y, { align: 'center' });
  y += 4;
  const phone = data.company?.phone ?? 'ඇමතුම්: 011 234 5678';
  doc.text(phone, layout.width / 2, y, { align: 'center' });
  y += 5;

  setFont(doc, 'bold', layout.fontTitle);
  doc.text(labels.receiptTitle, layout.width / 2, y, { align: 'center' });
  y += 6;

  setFont(doc, 'bold', layout.fontBody);
  doc.text(`${labels.receiptNo}: ${data.receiptNumber}`, contentX, y);
  y += 5;

  const { date, time } = formatPdfDateTime(data.date);
  setFont(doc, 'normal', layout.fontSmall);
  doc.text(`${labels.date}: ${date}    ${labels.time}: ${time}`, contentX, y);
  y = drawRule(doc, contentX, y + 3, contentWidth, 0.3) + 5;

  y = drawDetailRows(
    doc,
    [
      [labels.customerName, data.customer.name],
      [
        labels.paymentMethod,
        formatReceiptPaymentMethod(data.payment.method ?? 'CASH', displayMode),
      ],
    ],
    contentX,
    y,
    contentWidth,
    layout
  );

  y = drawRule(doc, contentX, y + 1, contentWidth, 0.3) + 5;

  const discountGiven = data.payment.discountGiven ?? 0;
  const totalApplied =
    data.payment.totalApplied ?? data.payment.cashReceived + discountGiven;

  const cashRows: Array<[string, number, boolean]> = [
    [labels.cashReceived, data.payment.cashReceived, false],
  ];
  if (discountGiven > 0) {
    cashRows.push([labels.discount, discountGiven, false]);
  }
  cashRows.push([labels.totalPaid, totalApplied, true]);

  y = drawAmountRows(doc, cashRows, contentX, y, contentWidth, layout);
  y = drawRule(doc, contentX, y + 1, contentWidth, 0.3) + 4;

  const inst = data.allocation.installments ?? 0;
  const principal = data.allocation.principal ?? 0;
  const lateFees = data.allocation.lateFees ?? 0;
  const advance = data.advancePayment ?? 0;
  const installmentAmount = inst > 0 ? inst : principal > 0 ? principal : 0;
  const extraPayment = advance > 0 ? advance : 0;

  y = drawSectionTitle(doc, labels.paymentBreakdown, contentX, y, layout);
  const breakdownRows: Array<[string, number, boolean]> = [];
  if (installmentAmount > 0) {
    breakdownRows.push([labels.installmentAmount, installmentAmount, false]);
  }
  if (lateFees > 0) {
    breakdownRows.push([labels.lateFees, lateFees, false]);
  }
  if (extraPayment > 0) {
    breakdownRows.push([labels.extraPayment, extraPayment, false]);
  }
  breakdownRows.push([labels.totalPaid, totalApplied, true]);
  y = drawAmountRows(doc, breakdownRows, contentX, y, contentWidth, layout);

  const repaymentMethod = (data.loan.repaymentMethod ??
    'FIXED_MONTHLY_INSTALLMENT') as RepaymentMethod;
  const receiptForInsight = pdfDataToReceiptBreakdown(
    data,
    totalApplied,
    discountGiven
  );
  const printInsight = buildReceiptPrintInsight(
    repaymentMethod,
    receiptForInsight,
    {
      ...data.printInsight,
      balanceBefore:
        data.printInsight?.balanceBefore ??
        data.balance.loanBalanceAfterPayment +
          totalApplied -
          (data.advancePayment ?? 0),
    }
  );

  const isFixed = repaymentMethod.includes('FIXED');
  const coverageLabel =
    printInsight.installmentCoverage === 'full'
      ? labels.installmentFull
      : printInsight.installmentCoverage === 'partial'
        ? labels.installmentPartial
        : null;
  const nextDueFormatted = formatReceiptInsightDate(
    printInsight.nextInstallmentDate
  );

  if (
    (isFixed && coverageLabel) ||
    printInsight.showLateFeeSettled ||
    nextDueFormatted
  ) {
    y = drawRule(doc, contentX, y + 0.5, contentWidth, 0.3) + 4;
    y = drawSectionTitle(doc, labels.loanImpact, contentX, y, layout);
    const impactRows: Array<[string, string]> = [];
    if (isFixed && coverageLabel) {
      impactRows.push([labels.installmentCoverage, coverageLabel]);
    }
    if (printInsight.showLateFeeSettled) {
      impactRows.push([
        labels.lateFeeSettled,
        printInsight.lateFeeSettled ? labels.yes : labels.no,
      ]);
    }
    if (nextDueFormatted) {
      impactRows.push([labels.nextInstallmentDate, nextDueFormatted]);
    }
    y = drawDetailRows(doc, impactRows, contentX, y, contentWidth, layout);
  }

  y = drawRule(doc, contentX, y + 0.5, contentWidth, 0.3) + 4;
  y = drawSectionTitle(doc, labels.balanceMovement, contentX, y, layout);
  y = drawAmountRows(
    doc,
    [
      [labels.previousBalance, printInsight.balanceBefore, false],
      [labels.paidToday, totalApplied, false],
      [labels.newBalance, data.balance.loanBalanceAfterPayment, true],
    ],
    contentX,
    y,
    contentWidth,
    layout
  );

  drawFooter(doc, labels, layout, footerY);
}

function pdfDataToReceiptBreakdown(
  data: PaymentReceiptData,
  totalApplied: number,
  discountApplied: number
): FixedInstallmentReceiptBreakdown | InterestOnlyReceiptBreakdown {
  const method = data.loan.repaymentMethod ?? '';
  if (method.includes('INTEREST')) {
    return {
      cashReceived: data.payment.cashReceived,
      discountApplied,
      totalApplied,
      interestPaid: data.allocation.installments ?? 0,
      principalPaid: data.allocation.principal ?? 0,
      remainingPrincipal: data.balance.loanBalanceAfterPayment,
      pendingInterestRemaining: 0,
      nextEstimatedInterest: 0,
    };
  }
  return {
    cashReceived: data.payment.cashReceived,
    discountApplied,
    totalApplied,
    lateFeePaid: data.allocation.lateFees ?? 0,
    installmentPaid: data.allocation.installments ?? 0,
    advancePaid: data.advancePayment ?? 0,
    remainingArrears: data.balance.arrearsRemaining ?? 0,
    loanBalance: data.balance.loanBalanceAfterPayment,
  };
}

function drawFooter(
  doc: JsPdfInstance,
  labels: ReturnType<typeof getReceiptLabels>,
  layout: Layout,
  footerY: number
): void {
  const centerX = layout.width / 2;
  drawRule(doc, layout.margin, footerY - 8, layout.width - layout.margin * 2, 0.3);
  setFont(doc, 'bold', layout.fontBody);
  doc.text(labels.thankYou, centerX, footerY, { align: 'center' });
  setFont(doc, 'normal', layout.fontSmall);
  doc.text(labels.keepReceipt, centerX, footerY + 5, { align: 'center' });
}

function createLayout(pageMode: ReceiptPdfPageMode): Layout {
  if (pageMode === 'thermal80') {
    return {
      pageMode,
      pageSize: [THERMAL_WIDTH_MM, THERMAL_HEIGHT_MM],
      width: THERMAL_WIDTH_MM,
      height: THERMAL_HEIGHT_MM,
      margin: 0,
      padding: 4,
      receiptWidth: THERMAL_WIDTH_MM,
      fontBody: 9,
      fontSmall: 8,
      fontHeader: 12,
      fontTitle: 10,
    };
  }

  return {
    pageMode,
    pageSize: 'a4',
    width: A4_WIDTH_MM,
    height: A4_HEIGHT_MM,
    margin: 20,
      padding: 10,
      receiptWidth: A4_WIDTH_MM - 40,
    fontBody: 10,
    fontSmall: 9,
    fontHeader: 16,
    fontTitle: 12,
  };
}

async function ensureReceiptFonts(doc: JsPdfInstance): Promise<void> {
  if (!fontLoadPromise) {
    fontLoadPromise = (async (): Promise<{ regular: string; bold: string }> => {
      const [regular, bold] = await Promise.all([
        fontUrlToBase64(sinhalaRegularFontUrl),
        fontUrlToBase64(sinhalaBoldFontUrl),
      ]);

      return { regular, bold };
    })();
  }

  const fonts = await fontLoadPromise;
  doc.addFileToVFS(FONT_REGULAR_FILE, fonts.regular);
  doc.addFont(FONT_REGULAR_FILE, FONT_REGULAR, 'normal');
  doc.addFileToVFS(FONT_BOLD_FILE, fonts.bold);
  doc.addFont(FONT_BOLD_FILE, FONT_BOLD, 'bold');
}

async function fontUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load receipt PDF font: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

function drawDetailRows(
  doc: JsPdfInstance,
  rows: Array<[string, string] | null>,
  x: number,
  y: number,
  width: number,
  layout: Layout
): number {
  const labelWidth = layout.pageMode === 'a4' ? width * 0.42 : width * 0.48;
  let cursorY = y;

  for (const row of rows) {
    if (!row) continue;
    const [label, value] = row;
    setFont(doc, 'bold', layout.fontBody);
    const labelLines = doc.splitTextToSize(label, labelWidth);
    doc.text(labelLines, x, cursorY);

    setFont(doc, 'normal', layout.fontBody);
    const valueLines = doc.splitTextToSize(value, width - labelWidth - 4);
    doc.text(valueLines, x + labelWidth + 4, cursorY);

    cursorY += Math.max(labelLines.length, valueLines.length) * lineHeight(layout.fontBody) + 1.5;
  }

  return cursorY;
}

function drawAmountRows(
  doc: JsPdfInstance,
  rows: Array<[string, number, boolean]>,
  x: number,
  y: number,
  width: number,
  layout: Layout
): number {
  let cursorY = y;
  const labelWidth = width * 0.56;

  for (const [label, amount, emphasize] of rows) {
    setFont(doc, emphasize ? 'bold' : 'normal', layout.fontBody);
    const labelLines = doc.splitTextToSize(label, labelWidth);
    doc.text(labelLines, x, cursorY);

    setFont(doc, 'bold', layout.fontBody);
    doc.text(formatLKR(amount), x + width, cursorY, { align: 'right' });

    cursorY += Math.max(labelLines.length * lineHeight(layout.fontBody), 5) + 1.5;
  }

  return cursorY;
}

function drawSectionTitle(
  doc: JsPdfInstance,
  title: string,
  x: number,
  y: number,
  layout: Layout
): number {
  setFont(doc, 'bold', layout.fontBody);
  doc.text(title, x, y);
  return y + 5;
}

function drawRule(
  doc: JsPdfInstance,
  x: number,
  y: number,
  width: number,
  lineWidth: number
): number {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(lineWidth);
  doc.line(x, y, x + width, y);
  return y;
}

function setFont(
  doc: JsPdfInstance,
  weight: 'normal' | 'bold',
  size: number
): void {
  doc.setFont(weight === 'bold' ? FONT_BOLD : FONT_REGULAR, weight);
  doc.setFontSize(size);
  doc.setTextColor(0, 0, 0);
}

function lineHeight(fontSize: number): number {
  return (fontSize * 1.25 * MM_PER_INCH) / POINTS_PER_INCH;
}

function receiptFilename(data: PaymentReceiptData): string {
  const safeReceiptNo = data.receiptNumber.replace(/[^a-z0-9-]+/gi, '-');
  return `payment-receipt-${safeReceiptNo}.pdf`;
}
