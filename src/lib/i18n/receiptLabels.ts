import type { DisplayMode } from './simpleLabels';

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
  balanceAfter: string;
  loanSummary: string;
  paidInterest: string;
  paidInstallment: string;
  paidPrincipal: string;
  remainingBalance: string;
  thankYou: string;
  keepReceipt: string;
}

const RECEIPT_EN: ReceiptLabelSet = {
  receiptTitle: 'Payment Receipt',
  receiptNo: 'Receipt No',
  date: 'Date',
  time: 'Time',
  customerName: 'Customer Name',
  paymentMethod: 'Payment Method',
  cashReceived: 'Cash Received',
  discount: 'Discount',
  totalPaid: 'Total Paid',
  balanceAfter: 'Balance After Payment',
  loanSummary: 'Loan Summary',
  paidInterest: 'Interest Paid',
  paidInstallment: 'Installment Paid',
  paidPrincipal: 'Principal Paid',
  remainingBalance: 'Remaining Balance',
  thankYou: 'Thank you for your payment',
  keepReceipt: 'Please keep this receipt safe',
};

const RECEIPT_SI: ReceiptLabelSet = {
  receiptTitle: 'ගෙවීම් ලදුපත',
  receiptNo: 'ලදුපත් අංකය',
  date: 'දිනය',
  time: 'වේලාව',
  customerName: 'පාරිභෝගික නම',
  paymentMethod: 'ගෙවූ ක්‍රමය',
  cashReceived: 'ලැබුණු මුදල',
  discount: 'වට්ටම',
  totalPaid: 'මුළු ගෙවූ මුදල',
  balanceAfter: 'ගෙවීමෙන් පසු ඉතිරිය',
  loanSummary: 'ණය සාරාංශය',
  paidInterest: 'ගෙවූ පොලී',
  paidInstallment: 'ගෙවූ වාරිකය',
  paidPrincipal: 'ගෙවූ මුල් මුදල',
  remainingBalance: 'ඉතිරි ශේෂය',
  thankYou: 'ස්තූතියි — ඔබගේ ගෙවීමට',
  keepReceipt: 'මෙය ආරක්ෂා කර තබාගන්න',
};

export function getReceiptLabels(mode: DisplayMode): ReceiptLabelSet {
  if (mode === 'en') return RECEIPT_EN;
  return RECEIPT_SI;
}

/** Strip internal prefixes (CUS-0004 → omit; LN-IO-0001 → 0001). */
export function formatReceiptLoanRef(loanCode: string): string | null {
  if (!loanCode) return null;
  const match = loanCode.match(/(\d+)\s*$/);
  return match ? match[1].padStart(4, '0') : null;
}

const PAYMENT_METHOD_LABELS: Record<
  string,
  { en: string; si: string }
> = {
  CASH: { en: 'Cash', si: 'මුදල්' },
  BANK_TRANSFER: { en: 'Bank transfer', si: 'බැංකු මාරුව' },
  CHEQUE: { en: 'Cheque', si: 'චෙක්පත' },
  OTHER: { en: 'Other', si: 'වෙනත්' },
};

export function formatReceiptPaymentMethod(
  method: string,
  mode: DisplayMode
): string {
  const key = method?.toUpperCase().replace(/\s+/g, '_') ?? '';
  const labels = PAYMENT_METHOD_LABELS[key];
  if (!labels) {
    return method
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase());
  }
  return mode === 'en' ? labels.en : labels.si;
}
