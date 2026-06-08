import type { DisplayMode } from './simpleLabels';
import {
  receipt as receiptEn,
  receiptPaymentMethods as receiptPaymentMethodsEn,
} from './locales/en';
import {
  receipt as receiptSi,
  receiptPaymentMethods as receiptPaymentMethodsSi,
} from './locales/si';

/** Receipt-only labels — no bilingual brackets; natural Sinhala or plain English. */
export interface ReceiptLabelSet {
  receiptTitle: string;
  receiptNo: string;
  date: string;
  time: string;
  customerName: string;
  paymentMethod: string;
  cashReceived: string;
  discount: string;
  totalPaid: string;
  installmentSettled: string;
  balanceAfter: string;
  paymentBreakdown: string;
  paymentAllocation: string;
  installmentAmount: string;
  lateFees: string;
  lateFeePaid: string;
  lateFeeBreakdown: string;
  lateFeeInstallmentLine: string;
  extraPayment: string;
  loanImpact: string;
  installmentCoverage: string;
  installmentFull: string;
  installmentPartial: string;
  lateFeeSettled: string;
  yes: string;
  no: string;
  nextInstallmentDate: string;
  balanceMovement: string;
  balanceUpdate: string;
  previousBalance: string;
  paidToday: string;
  installmentApplied: string;
  newBalance: string;
  loanSummary: string;
  paidInterest: string;
  paidInstallment: string;
  paidPrincipal: string;
  remainingBalance: string;
  thankYou: string;
  keepReceipt: string;
}

type ReceiptPaymentMethodKey = keyof typeof receiptPaymentMethodsEn;

export function getReceiptLabels(mode: DisplayMode): ReceiptLabelSet {
  if (mode === 'en') return receiptEn;
  return receiptSi;
}

/** Strip internal prefixes (CUS-0004 → omit; LN-IO-0001 → 0001). */
export function formatReceiptLoanRef(loanCode: string): string | null {
  if (!loanCode) return null;
  const match = loanCode.match(/(\d+)\s*$/);
  return match ? match[1].padStart(4, '0') : null;
}

export function formatReceiptPaymentMethod(
  method: string,
  mode: DisplayMode
): string {
  const key = method?.toUpperCase().replace(/\s+/g, '_') ?? '';
  const en =
    receiptPaymentMethodsEn[key as ReceiptPaymentMethodKey];
  const si =
    receiptPaymentMethodsSi[key as ReceiptPaymentMethodKey];
  if (en === undefined || si === undefined) {
    return method
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase());
  }
  return mode === 'en' ? en : si;
}
