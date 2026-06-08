import { LATE_FEE_GRACE_DAYS } from './constants';
import { computeDueDateForCycle } from './dueDates';
import { roundLKR } from './money';
import {
  addDaysToDate,
  calculateLateFeeCyclesFromGraceEnd,
  calculateLateMonthsFromDueDate,
  compareDateOnly,
  getAsOfDate,
  normalizeDate,
} from '../time/systemTime';

export { LATE_FEE_GRACE_DAYS };

/** First calendar day late-fee cycles accrue (due date + grace days). */
export function getLateFeeStartDate(dueDate: string): string {
  return addDaysToDate(dueDate, LATE_FEE_GRACE_DAYS);
}

/** True when as-of is on or after the late-fee cycle start date. */
export function isLateFeeAccrualEligible(
  dueDate: string,
  asOfDate: string
): boolean {
  return compareDateOnly(asOfDate, getLateFeeStartDate(dueDate)) >= 0;
}

export type LateFeeInstallmentStatus = 'PAID' | 'OVERDUE' | 'PENDING' | 'PARTIAL';

export interface LateFeeEngineInstallmentInput {
  installmentId: string;
  installmentNumber: number;
  dueDate: string;
  installmentAmount: number;
  paidAmount: number;
  lateFeePaid?: number;
  /** Historical charged snapshot from DB — used when principal is settled. */
  lateFeeCharged?: number;
  /**
   * Fixed-term rule: ≥50% of installment paid before grace-end — never accrue
   * late fees on this installment (set by lateFeeExemption helpers).
   */
  lateFeeExempt?: boolean;
}

export interface LateFeeEngineInput {
  monthlyInstallment: number;
  lateFeeRatePercent: number;
  installments: LateFeeEngineInstallmentInput[];
  paymentDate?: string | null;
  asOfDate?: string | null;
}

export interface ScheduleInstallment {
  index: number;
  installmentNumber: number;
  dueDate: string;
}

export interface LateFeeEngineLine {
  installmentId: string;
  installmentNumber: number;
  installmentIndex: number;
  dueDate: string;
  /** Monthly late-fee cycles since grace-end (fee = baseLateFee × lateMonths). */
  lateMonths: number;
  baseLateFee: number;
  /** Live accrued late fee at asOf (display + allocation). */
  lateFee: number;
  lateFeeOutstanding: number;
  remainingInstallment: number;
  status: LateFeeInstallmentStatus;
  /** Late-fee balance fully paid — no further monthly accumulation. */
  lateFeeSettled: boolean;
  lateFeeStartDate: string;
}

export interface LateFeeEngineTotals {
  totalLateFee: number;
  totalLateFeeOutstanding: number;
  totalInstallmentDue: number;
  totalOutstanding: number;
}

export interface LateFeeEngineResult extends LateFeeEngineTotals {
  asOfDate: string;
  baseLateFee: number;
  lines: LateFeeEngineLine[];
}

/** Build monthly installment due dates from loan start (index 0 = first due). */
export function generateMonthlySchedule(
  startDate: string,
  termMonths: number
): ScheduleInstallment[] {
  const start = normalizeDate(startDate);
  return Array.from({ length: termMonths }, (_, index) => ({
    index,
    installmentNumber: index + 1,
    dueDate: computeDueDateForCycle(start, index + 1),
  }));
}

/** Per-month late fee unit: monthlyInstallment × rate%. */
export function calculateBaseLateFee(
  monthlyInstallment: number,
  lateFeeRatePercent: number
): number {
  if (monthlyInstallment <= 0 || lateFeeRatePercent <= 0) return 0;
  return roundLKR(monthlyInstallment * (lateFeeRatePercent / 100));
}

export interface IndexedInstallment {
  installmentIndex: number;
  dueDate: string;
}

/**
 * @deprecated Index-based late months — use calculateLateFeeCyclesFromGraceEnd.
 */
export function resolveCurrentIndex(
  installments: IndexedInstallment[],
  paymentDate: string
): number {
  const pay = normalizeDate(paymentDate);
  let currentIndex = 0;
  for (const inst of installments) {
    if (compareDateOnly(pay, normalizeDate(inst.dueDate)) > 0) {
      currentIndex += 1;
    }
  }
  return currentIndex;
}

/**
 * @deprecated Use calculateLateFeeCyclesFromGraceEnd from ../time/systemTime.
 */
export function calculateLateMonthsFromIndex(
  installmentIndex: number,
  currentIndex: number,
  paymentDate: string,
  dueDate: string
): number {
  const pay = normalizeDate(paymentDate);
  const due = normalizeDate(dueDate);
  if (compareDateOnly(pay, due) <= 0) return 0;
  return Math.max(0, currentIndex - installmentIndex);
}

function resolveAsOfDate(input: LateFeeEngineInput): string {
  return getAsOfDate(input.paymentDate ?? input.asOfDate ?? undefined);
}

function isPrincipalPaid(inst: LateFeeEngineInstallmentInput): boolean {
  return inst.paidAmount >= inst.installmentAmount;
}

function deriveStatus(
  inst: LateFeeEngineInstallmentInput,
  asOf: string,
  lateFeeOutstanding: number,
  remainingInstallment: number
): LateFeeInstallmentStatus {
  const totalRemaining = roundLKR(lateFeeOutstanding + remainingInstallment);
  if (totalRemaining <= 0) return 'PAID';
  const due = normalizeDate(inst.dueDate);
  if (compareDateOnly(due, asOf) > 0) return 'PENDING';
  if (inst.paidAmount > 0 || (inst.lateFeePaid ?? 0) > 0) return 'PARTIAL';
  return 'OVERDUE';
}

interface SortedWithIndex extends LateFeeEngineInstallmentInput {
  installmentIndex: number;
}

function sortWithIndices(
  installments: LateFeeEngineInstallmentInput[]
): SortedWithIndex[] {
  const sorted = [...installments].sort((a, b) =>
    normalizeDate(a.dueDate).localeCompare(normalizeDate(b.dueDate))
  );
  return sorted.map((inst, installmentIndex) => ({ ...inst, installmentIndex }));
}

/** Late-fee penalty fully paid — freeze amount; stop monthly accumulation. */
function isLateFeeSettled(inst: LateFeeEngineInstallmentInput): boolean {
  const paid = inst.lateFeePaid ?? 0;
  const charged = inst.lateFeeCharged ?? 0;
  if (paid <= 0) return false;
  if (charged > 0 && paid >= charged) return true;
  return false;
}

function computeAccruedLateFee(
  inst: SortedWithIndex,
  baseLateFee: number,
  asOf: string
): {
  lateMonths: number;
  lateFee: number;
  lateFeeSettled: boolean;
} {
  if (inst.lateFeeExempt) {
    const lateFeePaid = inst.lateFeePaid ?? 0;
    const charged = inst.lateFeeCharged ?? 0;
    return {
      lateMonths: 0,
      lateFee: roundLKR(Math.max(lateFeePaid, charged)),
      lateFeeSettled: true,
    };
  }

  const due = normalizeDate(inst.dueDate);
  const cycleStart = getLateFeeStartDate(due);
  const lateMonths = calculateLateFeeCyclesFromGraceEnd(cycleStart, asOf);
  const accrued = roundLKR(baseLateFee * lateMonths);

  if (isLateFeeSettled(inst)) {
    const lateFeePaid = inst.lateFeePaid ?? 0;
    return {
      lateMonths: isPrincipalPaid(inst) ? 0 : lateMonths,
      lateFee: roundLKR(Math.max(lateFeePaid, inst.lateFeeCharged ?? 0)),
      lateFeeSettled: true,
    };
  }

  if (!isLateFeeAccrualEligible(due, asOf)) {
    return { lateMonths: 0, lateFee: 0, lateFeeSettled: false };
  }

  if (isPrincipalPaid(inst)) {
    const lateFeePaid = inst.lateFeePaid ?? 0;
    const charged = inst.lateFeeCharged ?? 0;
    return {
      lateMonths: 0,
      // Business rule: once installment principal is fully settled,
      // this installment must not accrue additional late-fee cycles.
      lateFee: roundLKR(Math.max(lateFeePaid, charged)),
      lateFeeSettled: isLateFeeSettled(inst),
    };
  }

  return { lateMonths, lateFee: accrued, lateFeeSettled: false };
}

function computeLine(
  inst: SortedWithIndex,
  baseLateFee: number,
  asOf: string
): LateFeeEngineLine {
  const due = normalizeDate(inst.dueDate);
  const lateFeePaid = inst.lateFeePaid ?? 0;
  const remainingInstallment = roundLKR(
    Math.max(0, inst.installmentAmount - inst.paidAmount)
  );

  const { lateMonths, lateFee, lateFeeSettled } = computeAccruedLateFee(
    inst,
    baseLateFee,
    asOf
  );
  const lateFeeOutstanding = lateFeeSettled
    ? 0
    : roundLKR(Math.max(0, lateFee - lateFeePaid));

  return {
    installmentId: inst.installmentId,
    installmentNumber: inst.installmentNumber,
    installmentIndex: inst.installmentIndex,
    dueDate: due,
    lateMonths,
    baseLateFee,
    lateFee,
    lateFeeOutstanding,
    remainingInstallment,
    status: deriveStatus(inst, asOf, lateFeeOutstanding, remainingInstallment),
    lateFeeSettled,
    lateFeeStartDate: getLateFeeStartDate(due),
  };
}

/**
 * Per-installment late-fee engine — monthly cycles from grace-end + as-of date.
 */
export function computeLoanLateFeesV3(
  input: LateFeeEngineInput
): LateFeeEngineResult {
  const asOfDate = resolveAsOfDate(input);
  const baseLateFee = calculateBaseLateFee(
    input.monthlyInstallment,
    input.lateFeeRatePercent
  );

  const indexed = sortWithIndices(input.installments);
  const lines = indexed.map((inst) => computeLine(inst, baseLateFee, asOfDate));

  let totalLateFee = 0;
  let totalLateFeeOutstanding = 0;
  let totalInstallmentDue = 0;

  for (const line of lines) {
    totalLateFee = roundLKR(totalLateFee + line.lateFee);
    totalLateFeeOutstanding = roundLKR(
      totalLateFeeOutstanding + line.lateFeeOutstanding
    );
    if (
      line.remainingInstallment > 0 &&
      compareDateOnly(line.dueDate, asOfDate) <= 0
    ) {
      totalInstallmentDue = roundLKR(
        totalInstallmentDue + line.remainingInstallment
      );
    }
  }

  const totalOutstanding = roundLKR(
    totalLateFeeOutstanding + totalInstallmentDue
  );

  return {
    asOfDate,
    baseLateFee,
    lines,
    totalLateFee,
    totalLateFeeOutstanding,
    totalInstallmentDue,
    totalOutstanding,
  };
}

export function getLateFeeLineByInstallmentId(
  result: LateFeeEngineResult,
  installmentId: string
): LateFeeEngineLine | undefined {
  return result.lines.find((l) => l.installmentId === installmentId);
}

/** Whole months overdue from due date (display only; includes grace). */
export function displayOverdueMonthsFromDue(
  dueDate: string,
  asOfDate: string
): number {
  return calculateLateMonthsFromDueDate(dueDate, asOfDate);
}
