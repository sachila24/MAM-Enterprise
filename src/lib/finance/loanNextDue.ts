import { nextInterestDueDateAfter } from './dueDates';
import { interestOutstandingOnCycle, type InterestCycleForAllocation } from './interestOnly';
import {
  calculateInstallmentLateFee,
  type InstallmentArrearsInput,
} from './fixedInstallmentStatus';

export interface NextDueDisplay {
  /** ISO date when a payment is due, or undefined when not date-based */
  dueDate?: string;
  /** User-facing label (never a raw ISO) */
  label: string;
}

function isInstallmentFullySettled(
  inst: InstallmentArrearsInput,
  lateFeeRate: number,
  today: string
): boolean {
  const instOut = Math.max(0, inst.installmentAmount - inst.paidAmount);
  const { lateFeeAmount } = calculateInstallmentLateFee(
    inst,
    lateFeeRate,
    today
  );
  const lateOut = Math.max(0, lateFeeAmount - inst.lateFeePaid);
  return instOut <= 0 && lateOut <= 0;
}

/** Earliest installment that still owes principal or late fee (computed as of `today`). */
export function getNextDueDateForFixedInstallments(
  installments: InstallmentArrearsInput[],
  lateFeeRate: number,
  today: string
): NextDueDisplay {
  const sorted = [...installments].sort(
    (a, b) => a.installmentNumber - b.installmentNumber
  );
  for (const inst of sorted) {
    if (!isInstallmentFullySettled(inst, lateFeeRate, today)) {
      return { dueDate: inst.dueDate.split('T')[0], label: inst.dueDate.split('T')[0] };
    }
  }
  return { label: 'No due payments' };
}

/** Next unpaid interest cycle; if none owe interest, next cycle boundary after `today`. */
export function getNextDueDateForInterestOnly(
  startDate: string,
  cycles: InterestCycleForAllocation[],
  today: string
): NextDueDisplay {
  const sorted = [...cycles].sort(
    (a, b) => a.cycleNumber - b.cycleNumber
  );
  for (const c of sorted) {
    if (interestOutstandingOnCycle(c) > 0) {
      return { dueDate: c.dueDate.split('T')[0], label: c.dueDate.split('T')[0] };
    }
  }
  const next = nextInterestDueDateAfter(startDate, today);
  return { dueDate: next, label: next };
}
