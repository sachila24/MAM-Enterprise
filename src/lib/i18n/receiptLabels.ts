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
  paymentBreakdown: string;
  installmentAmount: string;
  lateFees: string;
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
  previousBalance: string;
  paidToday: string;
  newBalance: string;
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
  paymentBreakdown: 'Payment Breakdown',
  installmentAmount: 'Installment Amount',
  lateFees: 'Late Fees',
  extraPayment: 'Extra Payment',
  loanImpact: 'Loan Impact',
  installmentCoverage: 'This Installment',
  installmentFull: 'Full',
  installmentPartial: 'Partial',
  lateFeeSettled: 'Late Fees Settled',
  yes: 'Yes',
  no: 'No',
  nextInstallmentDate: 'Next Installment Date',
  balanceMovement: 'Balance Movement',
  previousBalance: 'Previous Balance',
  paidToday: 'Paid Today',
  newBalance: 'New Balance',
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
  customerName: 'පාරිභෝගිකයාගේ නම',
  paymentMethod: 'ගෙවූ ක්‍රමය',
  cashReceived: 'ලැබුණු මුදල',
  discount: 'වට්ටම',
  totalPaid: 'මුළු ගෙවූ මුදල',
  balanceAfter: 'ගෙවීමෙන් පසු ඉතිරිය',
  paymentBreakdown: 'ගෙවීම් විස්තරය',
  installmentAmount: 'වාරික මුදල',
  lateFees: 'ප්‍රමාද ගාස්තු',
  extraPayment: 'අමතර ගෙවීම',
  loanImpact: 'ණය බලපෑම',
  installmentCoverage: 'මෙම වාරිකය',
  installmentFull: 'සම්පූර්ණ',
  installmentPartial: 'අර්ධ',
  lateFeeSettled: 'ප්‍රමාද ගාස්තු ගෙවීද',
  yes: 'ඔව්',
  no: 'නැත',
  nextInstallmentDate: 'ඊළඟ වාරික දිනය',
  balanceMovement: 'ශේෂ වෙනස්වීම',
  previousBalance: 'පෙර ශේෂය',
  paidToday: 'අද ගෙවූ මුදල',
  newBalance: 'නව ශේෂය',
  loanSummary: 'ණය පිලිබඳ සාරාංශය',
  paidInterest: 'ගෙවූ පොලී',
  paidInstallment: 'ගෙවූ වාරිකය',
  paidPrincipal: 'ගෙවූ මුල් මුදල',
  remainingBalance: 'ඉතිරි ශේෂය',
  thankYou: 'ඔබගේ ගෙවීමට ස්තූතියි',
  keepReceipt: 'මෙය සුරක්ෂිතව තබාගන්න',
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
