import { DEFAULT_LATE_FEE_RATE_PERCENT } from './constants';
import {
  calculateInstallmentLateFeeAmount,
  calculateMonthsLate,
} from './fixedInstallment';
import { roundLKR } from './money';

export type InstallmentDisplayStatus = 'PAID' | 'PARTIAL' | 'OVERDUE' | 'PENDING';

export interface InstallmentArrearsInput {
  installmentNumber: number;
  dueDate: string;
  installmentAmount: number;
  paidAmount: number;
  lateFeeAmount: number;
  lateFeePaid: number;
}

export interface CalculatedInstallmentLateFee {
  monthsLate: number;
  /** Total late fee accrued (installment × rate × months late). */
  lateFeeAmount: number;
  /** Outstanding late fee after payments. */
  lateFeeOutstanding: number;
}

export interface FixedLoanArrearsSummary {
  arrearsInstallmentCount: number;
  arrearsInstallmentAmount: number;
  lateFeesDue: number;
  totalArrearsDue: number;
  hasArrears: boolean;
}

export interface EnrichedFixedInstallment extends InstallmentArrearsInput {
  id: string;
  displayStatus: InstallmentDisplayStatus;
  installmentRemaining: number;
  /** Total late fee accrued for display. */
  lateFeeAccrued: number;
  /** Outstanding late fee still owed. */
  lateFeeOutstanding: number;
  remaining: number;
}

function toDateOnly(iso: string): string {
  return iso.split('T')[0];
}

/**
 * Shared late-fee calculation for fixed installment loans.
 * Formula: installment_amount × (late_fee_rate / 100) × months_late
 * Uses full installment amount (not remaining principal).
 */
export function calculateInstallmentLateFee(
  inst: InstallmentArrearsInput,
  lateFeeRatePercent: number = DEFAULT_LATE_FEE_RATE_PERCENT,
  today: string = new Date().toISOString().split('T')[0]
): CalculatedInstallmentLateFee {
  const due = toDateOnly(inst.dueDate);
  const asOf = toDateOnly(today);

  if (due >= asOf) {
    return { monthsLate: 0, lateFeeAmount: 0, lateFeeOutstanding: 0 };
  }

  if (inst.paidAmount >= inst.installmentAmount) {
    const lateFeeOutstanding = roundLKR(
      Math.max(0, inst.lateFeeAmount - inst.lateFeePaid)
    );
    return {
      monthsLate: 0,
      lateFeeAmount: inst.lateFeeAmount,
      lateFeeOutstanding,
    };
  }

  const monthsLate = calculateMonthsLate(due, asOf);
  const lateFeeAmount = calculateInstallmentLateFeeAmount(
    inst.installmentAmount,
    lateFeeRatePercent,
    monthsLate
  );
  const lateFeeOutstanding = roundLKR(
    Math.max(0, lateFeeAmount - inst.lateFeePaid)
  );

  return { monthsLate, lateFeeAmount, lateFeeOutstanding };
}

export function isInstallmentFullyPaid(
  inst: InstallmentArrearsInput,
  today: string,
  lateFeeRatePercent: number = DEFAULT_LATE_FEE_RATE_PERCENT
): boolean {
  if (inst.paidAmount < inst.installmentAmount) return false;
  const { lateFeeOutstanding } = calculateInstallmentLateFee(
    inst,
    lateFeeRatePercent,
    today
  );
  return lateFeeOutstanding <= 0;
}

/** Due before today and installment principal not fully paid. */
export function isInstallmentInArrears(
  inst: InstallmentArrearsInput,
  today: string
): boolean {
  return (
    toDateOnly(inst.dueDate) < toDateOnly(today) &&
    inst.paidAmount < inst.installmentAmount
  );
}

export function getInstallmentDisplayStatus(
  inst: InstallmentArrearsInput,
  today: string,
  lateFeeRatePercent: number = DEFAULT_LATE_FEE_RATE_PERCENT
): InstallmentDisplayStatus {
  if (isInstallmentFullyPaid(inst, today, lateFeeRatePercent)) return 'PAID';

  const pastDue = toDateOnly(inst.dueDate) < toDateOnly(today);
  const hasPartialPayment =
    inst.paidAmount > 0 ||
    (inst.lateFeePaid > 0 &&
      calculateInstallmentLateFee(inst, lateFeeRatePercent, today)
        .lateFeeOutstanding > 0);

  if (pastDue && hasPartialPayment) return 'PARTIAL';
  if (pastDue) return 'OVERDUE';
  if (hasPartialPayment) return 'PARTIAL';
  return 'PENDING';
}

export function getFixedLoanArrearsSummary(
  installments: InstallmentArrearsInput[],
  today: string,
  lateFeeRatePercent: number = DEFAULT_LATE_FEE_RATE_PERCENT
): FixedLoanArrearsSummary {
  let arrearsInstallmentCount = 0;
  let arrearsInstallmentAmount = 0;
  let lateFeesDue = 0;

  for (const inst of installments) {
    if (!isInstallmentInArrears(inst, today)) continue;
    arrearsInstallmentCount += 1;
    arrearsInstallmentAmount = roundLKR(
      arrearsInstallmentAmount +
        Math.max(0, inst.installmentAmount - inst.paidAmount)
    );
    lateFeesDue = roundLKR(
      lateFeesDue +
        calculateInstallmentLateFee(inst, lateFeeRatePercent, today)
          .lateFeeOutstanding
    );
  }

  return {
    arrearsInstallmentCount,
    arrearsInstallmentAmount,
    lateFeesDue,
    totalArrearsDue: roundLKR(arrearsInstallmentAmount + lateFeesDue),
    hasArrears: arrearsInstallmentCount > 0,
  };
}

/** Latest due installment on or before as-of that still owes principal. */
export function resolveCurrentInstallmentNumber(
  installments: InstallmentArrearsInput[],
  asOfDate: string
): number {
  const sorted = [...installments].sort(
    (a, b) => a.installmentNumber - b.installmentNumber
  );
  const asOf = toDateOnly(asOfDate);
  const dueUnpaid = sorted.filter(
    (i) =>
      toDateOnly(i.dueDate) <= asOf && i.paidAmount < i.installmentAmount
  );
  if (dueUnpaid.length > 0) {
    return dueUnpaid[dueUnpaid.length - 1].installmentNumber;
  }
  const next = sorted.find((i) => toDateOnly(i.dueDate) > asOf);
  return next?.installmentNumber ?? sorted[sorted.length - 1]?.installmentNumber ?? 1;
}

export function getFixedLoanDisplayStatus(
  storedStatus: string,
  installments: InstallmentArrearsInput[],
  today: string,
  lateFeeRatePercent: number = DEFAULT_LATE_FEE_RATE_PERCENT
): string {
  if (getFixedLoanArrearsSummary(installments, today, lateFeeRatePercent).hasArrears) {
    return 'OVERDUE';
  }
  return storedStatus;
}

export function enrichFixedInstallment<T extends InstallmentArrearsInput & { id: string }>(
  inst: T,
  today: string,
  lateFeeRatePercent: number
): T & EnrichedFixedInstallment {
  const { lateFeeAmount, lateFeeOutstanding } = calculateInstallmentLateFee(
    inst,
    lateFeeRatePercent,
    today
  );
  const installmentRemaining = roundLKR(
    Math.max(0, inst.installmentAmount - inst.paidAmount)
  );
  const remaining = roundLKR(installmentRemaining + lateFeeOutstanding);

  return {
    ...inst,
    displayStatus: getInstallmentDisplayStatus(inst, today, lateFeeRatePercent),
    installmentRemaining,
    lateFeeAccrued: lateFeeAmount,
    lateFeeOutstanding,
    remaining,
  };
}

/** Oldest overdue installment due date (for dashboard days overdue). */
export function oldestArrearsDueDate(
  installments: InstallmentArrearsInput[],
  today: string
): string | null {
  const arrears = installments
    .filter((i) => isInstallmentInArrears(i, today))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return arrears[0]?.dueDate ?? null;
}

export function daysBetweenDates(fromDate: string, toDate: string): number {
  const from = new Date(toDateOnly(fromDate) + 'T12:00:00');
  const to = new Date(toDateOnly(toDate) + 'T12:00:00');
  return Math.max(
    0,
    Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
  );
}
