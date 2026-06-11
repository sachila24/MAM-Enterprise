import type { PaymentAllocationResult } from './paymentAllocation';
import type { InstallmentForAllocation } from './paymentAllocation';
import {
  runLateFeeEngine,
  type InstallmentArrearsInput,
} from './fixedInstallmentStatus';
import { getLateFeeLineByInstallmentId } from './lateFeeEngineV3';
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
  lateFeeRatePercent: number = DEFAULT_LATE_FEE_RATE_PERCENT,
  monthlyInstallmentAmount?: number,
  lateFeeExemptByInstallmentId?: Readonly<Record<string, boolean>>
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

  const engine = runLateFeeEngine(
    sorted.map((i) => ({
      id: i.id,
      installmentNumber: i.installmentNumber,
      dueDate: i.dueDate,
      installmentAmount: i.installmentAmount,
      paidAmount: i.paidAmount,
      lateFeeAmount: i.lateFeeAmount,
      lateFeePaid: i.lateFeePaid,
    })),
    monthlyInstallmentAmount ?? sorted[0]?.installmentAmount ?? 0,
    lateFeeRatePercent,
    { paymentDate, lateFeeExemptByInstallmentId }
  );

  for (const inst of sorted) {
    const line = getLateFeeLineByInstallmentId(engine, inst.id);
    const lateFeeOutstanding = line?.lateFeeOutstanding ?? 0;
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

function parseScheduleNumber(period: string): number | null {
  const inst = period.match(/#(\d+)/);
  if (inst) return parseInt(inst[1], 10);
  const cycle = period.match(/Cycle\s+(\d+)/i);
  if (cycle) return parseInt(cycle[1], 10);
  return null;
}

function rowKey(row: AllocationDisplayRow): string {
  return `${row.type}|${row.period}`;
}

export type AllocationRowBadge = 'Paid' | 'Partial' | 'Remaining';

/** UI-only badge for schedule rows (does not affect allocation). */
export function getAllocationRowBadge(
  row: AllocationDisplayRow
): AllocationRowBadge | null {
  if (row.paidByPayment > 0 && row.remaining === 0) return 'Paid';
  if (row.paidByPayment > 0 && row.remaining > 0) return 'Partial';
  if (row.remaining > 0) return 'Remaining';
  return null;
}

/**
 * Subset for payment review: current period, next upcoming, partials, and rows
 * touched by this payment. Display-only — does not change allocation math.
 */
export function selectCompactAllocationRows(
  rows: AllocationDisplayRow[],
  currentNumber: number,
  maxUpcoming = 2
): AllocationDisplayRow[] {
  const maxNum = currentNumber + maxUpcoming;
  const keys = new Set<string>();

  for (const row of rows) {
    const num = parseScheduleNumber(row.period);
    const key = rowKey(row);

    if (num == null) {
      if (row.paidByPayment > 0) keys.add(key);
      continue;
    }

    const inWindow = num >= currentNumber && num <= maxNum;
    const touchedByPayment = row.paidByPayment > 0;
    const partialBefore =
      row.remaining > 0 && row.due > row.remaining && num < currentNumber;

    if (inWindow || touchedByPayment || partialBefore) {
      keys.add(key);
    }
  }

  return rows.filter((r) => keys.has(rowKey(r)));
}
