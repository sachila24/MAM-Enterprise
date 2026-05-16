import type { PaymentAllocationResult } from './paymentAllocation';
import type { InstallmentForAllocation } from './paymentAllocation';
import {
  calculateInstallmentLateFee,
  type InstallmentArrearsInput,
} from './fixedInstallmentStatus';
import { DEFAULT_LATE_FEE_RATE_PERCENT } from './constants';
import {
  interestOutstandingOnCycle,
  type InterestCycleForAllocation,
} from './interestOnly';
import { roundLKR } from './money';

export interface AllocationDisplayRow {
  type: string;
  period: string;
  due: number;
  paidByPayment: number;
  remaining: number;
}

function installmentOutstanding(inst: InstallmentForAllocation): number {
  return roundLKR(Math.max(0, inst.installmentAmount - inst.paidAmount));
}

export function buildInterestOnlyAllocationRows(
  cycles: InterestCycleForAllocation[],
  allocation: PaymentAllocationResult
): AllocationDisplayRow[] {
  const paidByCycle = new Map<string, number>();
  for (const line of allocation.allocations) {
    if (
      (line.allocationType === 'INTEREST' ||
        line.allocationType === 'INTEREST_DISCOUNT') &&
      line.interestCycleId
    ) {
      paidByCycle.set(
        line.interestCycleId,
        roundLKR((paidByCycle.get(line.interestCycleId) ?? 0) + line.amount)
      );
    }
  }

  const rows: AllocationDisplayRow[] = cycles
    .filter((c) => interestOutstandingOnCycle(c) > 0 || paidByCycle.has(c.id))
    .sort((a, b) => a.cycleNumber - b.cycleNumber)
    .map((c) => {
      const due = interestOutstandingOnCycle(c);
      const paid = paidByCycle.get(c.id) ?? 0;
      return {
        type: 'Interest',
        period: `Cycle ${c.cycleNumber} · ${c.dueDate}`,
        due: roundLKR(due + paid),
        paidByPayment: paid,
        remaining: roundLKR(Math.max(0, due - paid)),
      };
    });

  if (allocation.summary.principalPaid && allocation.summary.principalPaid > 0) {
    rows.push({
      type: 'Principal',
      period: 'Principal reduction',
      due: allocation.summary.newPrincipal
        ? roundLKR(
            (allocation.summary.newPrincipal ?? 0) +
              (allocation.summary.principalPaid ?? 0)
          )
        : 0,
      paidByPayment: allocation.summary.principalPaid,
      remaining: allocation.summary.newPrincipal ?? 0,
    });
  }

  return rows;
}

export function buildFixedInstallmentAllocationRows(
  installments: InstallmentForAllocation[],
  allocation: PaymentAllocationResult,
  paymentDate: string,
  lateFeeRatePercent: number = DEFAULT_LATE_FEE_RATE_PERCENT
): AllocationDisplayRow[] {
  const rows: AllocationDisplayRow[] = [];
  const paidByInst = new Map<string, { late: number; inst: number }>();

  for (const line of allocation.allocations) {
    if (!line.installmentId) continue;
    const cur = paidByInst.get(line.installmentId) ?? { late: 0, inst: 0 };
    if (
      line.allocationType === 'LATE_FEE' ||
      line.allocationType === 'LATE_FEE_DISCOUNT'
    ) {
      cur.late = roundLKR(cur.late + line.amount);
    }
    if (
      line.allocationType === 'INSTALLMENT' ||
      line.allocationType === 'INSTALLMENT_DISCOUNT'
    ) {
      cur.inst = roundLKR(cur.inst + line.amount);
    }
    paidByInst.set(line.installmentId, cur);
  }

  const sorted = [...installments].sort(
    (a, b) => a.installmentNumber - b.installmentNumber
  );

  for (const inst of sorted) {
    const instInput: InstallmentArrearsInput = {
      installmentNumber: inst.installmentNumber,
      dueDate: inst.dueDate,
      installmentAmount: inst.installmentAmount,
      paidAmount: inst.paidAmount,
      lateFeeAmount: inst.lateFeeAmount,
      lateFeePaid: inst.lateFeePaid,
    };
    const { lateFeeOutstanding } = calculateInstallmentLateFee(
      instInput,
      lateFeeRatePercent,
      paymentDate
    );
    const instOwed = installmentOutstanding(inst);
    const paid = paidByInst.get(inst.id) ?? { late: 0, inst: 0 };

    const lateDue = lateFeeOutstanding;
    if (lateDue > 0 || paid.late > 0) {
      rows.push({
        type: 'Late fee',
        period: `#${inst.installmentNumber} · ${inst.dueDate}`,
        due: roundLKR(lateDue + paid.late),
        paidByPayment: paid.late,
        remaining: roundLKR(Math.max(0, lateDue - paid.late)),
      });
    }

    if (instOwed > 0 || paid.inst > 0) {
      rows.push({
        type: 'Installment',
        period: `#${inst.installmentNumber} · ${inst.dueDate}`,
        due: roundLKR(instOwed + paid.inst),
        paidByPayment: paid.inst,
        remaining: roundLKR(Math.max(0, instOwed - paid.inst)),
      });
    }
  }

  const advance = allocation.summary.advanceAmount ?? 0;
  if (advance > 0) {
    rows.push({
      type: 'Advance',
      period: 'Extra / advance',
      due: 0,
      paidByPayment: advance,
      remaining: 0,
    });
  }

  return rows;
}

/** Rows touched by this payment only — for compact receipts (excludes untouched schedule). */
export function filterAffectedAllocationRows(
  rows: AllocationDisplayRow[],
  maxRows = 5
): AllocationDisplayRow[] {
  return rows.filter((r) => r.paidByPayment > 0).slice(0, maxRows);
}
