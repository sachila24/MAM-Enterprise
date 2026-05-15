import { roundLKR } from './money';

export interface FixedInstallmentTermsInput {
  financeAmount: number;
  termMonths: number;
  monthlyFlatRatePercent: number;
  discountAmount?: number;
}

export interface FixedInstallmentTotals {
  financeAmount: number;
  totalInterest: number;
  totalBeforeDiscount: number;
  discountAmount: number;
  totalPayable: number;
  monthlyInstallment: number;
  termMonths: number;
}

export interface InstallmentScheduleLine {
  installmentNumber: number;
  dueDate: string;
  principalComponent: number;
  interestComponent: number;
  installmentAmount: number;
}

export interface LateFeeInput {
  installmentAmount: number;
  lateFeeRatePercent: number;
  monthsLate: number;
}

/**
 * Flat monthly rate over full term:
 * totalInterest = finance × rate% × termMonths
 */
export function calculateFixedInstallmentTotals(
  input: FixedInstallmentTermsInput
): FixedInstallmentTotals {
  const { financeAmount, termMonths, monthlyFlatRatePercent } = input;
  const discountAmount = input.discountAmount ?? 0;
  const totalInterest = roundLKR(
    financeAmount * (monthlyFlatRatePercent / 100) * termMonths
  );
  const totalBeforeDiscount = roundLKR(financeAmount + totalInterest);
  const totalPayable = roundLKR(totalBeforeDiscount - discountAmount);
  const monthlyInstallment =
    termMonths > 0 ? roundLKR(Math.ceil(totalPayable / termMonths)) : 0;

  return {
    financeAmount,
    totalInterest,
    totalBeforeDiscount,
    discountAmount,
    totalPayable,
    monthlyInstallment,
    termMonths,
  };
}

/** Per-month late fee × months late (compounded by month count, not compound interest). */
export function calculateLateFee(input: LateFeeInput): number {
  const { installmentAmount, lateFeeRatePercent, monthsLate } = input;
  if (monthsLate <= 0) return 0;
  const perMonth = roundLKR(installmentAmount * (lateFeeRatePercent / 100));
  return roundLKR(perMonth * monthsLate);
}

export function calculateLateFeePerMonth(
  installmentAmount: number,
  lateFeeRatePercent: number
): number {
  return calculateLateFee({
    installmentAmount,
    lateFeeRatePercent,
    monthsLate: 1,
  });
}

/** Months between due date and payment date (calendar months, minimum 0). */
export function monthsLate(dueDate: string, paymentDate: string): number {
  const due = new Date(dueDate);
  const paid = new Date(paymentDate);
  if (paid <= due) return 0;
  const months =
    (paid.getFullYear() - due.getFullYear()) * 12 +
    (paid.getMonth() - due.getMonth());
  return Math.max(0, months);
}

export function buildFixedInstallmentSchedule(
  totals: FixedInstallmentTotals,
  firstDueDate: string
): InstallmentScheduleLine[] {
  const { termMonths, financeAmount, totalInterest, monthlyInstallment } =
    totals;
  if (termMonths <= 0) return [];

  const principalPerMonth = roundLKR(financeAmount / termMonths);
  const interestPerMonth = roundLKR(totalInterest / termMonths);
  const lines: InstallmentScheduleLine[] = [];
  const anchor = new Date(firstDueDate);

  for (let i = 0; i < termMonths; i++) {
    const due = new Date(anchor);
    due.setMonth(anchor.getMonth() + i);
    const isLast = i === termMonths - 1;
    const principalComponent = isLast
      ? roundLKR(financeAmount - principalPerMonth * (termMonths - 1))
      : principalPerMonth;
    const interestComponent = isLast
      ? roundLKR(totalInterest - interestPerMonth * (termMonths - 1))
      : interestPerMonth;
    const installmentAmount = isLast
      ? roundLKR(
          totals.totalPayable -
            monthlyInstallment * (termMonths - 1)
        )
      : monthlyInstallment;

    lines.push({
      installmentNumber: i + 1,
      dueDate: due.toISOString().split('T')[0],
      principalComponent,
      interestComponent,
      installmentAmount,
    });
  }

  return lines;
}

/** Bike finance amount = selling price − down payment. */
export function calculateBikeFinanceAmount(
  sellingPrice: number,
  downPayment: number
): number {
  return roundLKR(Math.max(0, sellingPrice - downPayment));
}
