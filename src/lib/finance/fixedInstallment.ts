import { roundLKR } from './money';
import {
  calculateLateMonthsFromIndex,
  resolveCurrentIndex,
} from './lateFeeEngineV3';

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

export {
  calculateBaseLateFee,
  computeLoanLateFeesV3 as computeLoanLateFees,
  generateMonthlySchedule,
  type LateFeeEngineLine,
  type LateFeeEngineResult,
  type LateFeeEngineInstallmentInput,
} from './lateFeeEngineV3';

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

/** @deprecated Use calculateBaseLateFeeUnit from ./lateFee */
export function calculateLateFeePerMonth(
  installmentAmount: number,
  lateFeeRatePercent: number
): number {
  return roundLKR(installmentAmount * (lateFeeRatePercent / 100));
}

/** Per-month unit × months late (legacy helper). */
export function calculateLateFeeAmount(input: LateFeeInput): number {
  const { installmentAmount, lateFeeRatePercent, monthsLate } = input;
  if (monthsLate <= 0) return 0;
  const perMonth = calculateLateFeePerMonth(
    installmentAmount,
    lateFeeRatePercent
  );
  return roundLKR(perMonth * monthsLate);
}

/**
 * @deprecated Use computeLoanLateFeesV3 with the full installment schedule.
 * Single-installment fallback (index 0 only).
 */
export function calculateMonthsLate(dueDate: string, today: string): number {
  return calculateLateMonthsFromIndex(
    0,
    resolveCurrentIndex([{ installmentIndex: 0, dueDate }], today),
    today,
    dueDate
  );
}

/** Late fee = baseLateFeeUnit × overdue months (whole LKR). */
export function calculateInstallmentLateFeeAmount(
  monthlyInstallment: number,
  lateFeeRatePercent: number,
  monthsLateCount: number
): number {
  if (monthsLateCount <= 0) return 0;
  const base = calculateLateFeePerMonth(monthlyInstallment, lateFeeRatePercent);
  return roundLKR(base * monthsLateCount);
}

/** Alias for payment allocation and legacy callers. */
export function monthsLate(dueDate: string, paymentDate: string): number {
  return calculateMonthsLate(dueDate, paymentDate);
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
