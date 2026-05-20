import { computeDueDateForCycle } from './dueDates';
import { roundLKR } from './money';
import {
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
  /** Index of the active payment period (count of installments strictly past due). */
  currentIndex: number;
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
 * Payment-period index at paymentDate: count of installments whose due date
 * is strictly before the payment date (same due day → not counted).
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
 * Index-based late months: currentIndex − installmentIndex.
 * No calendar-month or date-diff aging.
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
  lateMonths: number
): LateFeeInstallmentStatus {
  if (isPrincipalPaid(inst)) return 'PAID';
  const due = normalizeDate(inst.dueDate);
  if (compareDateOnly(due, asOf) > 0) return 'PENDING';
  if (lateMonths > 0 && inst.paidAmount > 0) return 'PARTIAL';
  if (lateMonths > 0) return 'OVERDUE';
  if (inst.paidAmount > 0) return 'PARTIAL';
  return 'PENDING';
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

function computeLine(
  inst: SortedWithIndex,
  baseLateFee: number,
  asOf: string,
  currentIndex: number
): LateFeeEngineLine {
  const due = normalizeDate(inst.dueDate);
  const lateFeePaid = inst.lateFeePaid ?? 0;
  const remainingInstallment = roundLKR(
    Math.max(0, inst.installmentAmount - inst.paidAmount)
  );

  let lateMonths = 0;
  let lateFee = 0;

  if (!isPrincipalPaid(inst)) {
    lateMonths = calculateLateMonthsFromIndex(
      inst.installmentIndex,
      currentIndex,
      asOf,
      due
    );
    lateFee = roundLKR(baseLateFee * lateMonths);
  }

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
    status: deriveStatus(inst, asOf, lateMonths),
  };
}

/**
 * Installment-index late-fee engine — single source of truth for all screens.
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
  const currentIndex = resolveCurrentIndex(indexed, asOfDate);

  const lines = indexed.map((inst) =>
    computeLine(inst, baseLateFee, asOfDate, currentIndex)
  );

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
    currentIndex,
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
