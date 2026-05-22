import { computeDueDateForCycle } from './dueDates';
import { roundLKR } from './money';
import {
  calculateLateMonthsFromDueDate,
  compareDateOnly,
  getAsOfDate,
  normalizeDate,
} from '../time/systemTime';

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
  lateMonths: number;
  baseLateFee: number;
  /** Live accrued late fee at asOf (display + allocation). */
  lateFee: number;
  lateFeeOutstanding: number;
  remainingInstallment: number;
  status: LateFeeInstallmentStatus;
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
 * @deprecated Index-based late months — use calculateLateMonthsFromDueDate per installment.
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
 * @deprecated Use calculateLateMonthsFromDueDate from ../time/systemTime.
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

function computeAccruedLateFee(
  inst: SortedWithIndex,
  baseLateFee: number,
  asOf: string
): { lateMonths: number; lateFee: number } {
  const due = normalizeDate(inst.dueDate);
  const lateMonths = calculateLateMonthsFromDueDate(due, asOf);
  const timeBased = roundLKR(baseLateFee * lateMonths);

  if (!isPrincipalPaid(inst)) {
    return { lateMonths, lateFee: timeBased };
  }

  const lateFeePaid = inst.lateFeePaid ?? 0;
  const charged = inst.lateFeeCharged ?? 0;
  return {
    lateMonths: 0,
    lateFee: roundLKR(Math.max(lateFeePaid, charged)),
  };
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

  const { lateMonths, lateFee } = computeAccruedLateFee(inst, baseLateFee, asOf);
  const lateFeeOutstanding = roundLKR(Math.max(0, lateFee - lateFeePaid));

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
  };
}

/**
 * Per-installment late-fee engine — live accrual from due date + as-of date.
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
