/**
 * Fixed-term installment late-fee exemption when ≥50% of an installment
 * is paid toward principal before due date + grace (late-fee accrual start).
 */

import type { MamDemoDb } from '../local-db/types';
import type { PaymentAllocationLine } from './paymentAllocation';

/** Re-run 50% pre-grace exemption after draft allocation lines exist. */
export type LateFeeExemptAfterAllocationFn = (
  pendingAllocations: PaymentAllocationLine[]
) => Readonly<Record<string, boolean>>;
import { roundLKR } from './money';
import { getLateFeeStartDate } from './lateFeeEngineV3';
import { compareDateOnly, normalizeDate } from '../time/systemTime';

/** Share of installment amount that must be paid pre-grace to waive late fees. */
export const LATE_FEE_HALF_PAYMENT_EXEMPT_RATIO = 0.5;

const INSTALLMENT_PRINCIPAL_ALLOC_TYPES = new Set([
  'INSTALLMENT',
  'INSTALLMENT_DISCOUNT',
]);

export function halfInstallmentLateFeeExemptThreshold(
  installmentAmount: number
): number {
  return roundLKR(installmentAmount * LATE_FEE_HALF_PAYMENT_EXEMPT_RATIO);
}

/** True when cumulative pre-grace principal paid meets the 50% threshold. */
export function isLateFeeExemptByHalfPreGracePayment(
  installmentAmount: number,
  preGracePrincipalPaid: number
): boolean {
  if (installmentAmount <= 0 || preGracePrincipalPaid <= 0) return false;
  return (
    preGracePrincipalPaid >=
    halfInstallmentLateFeeExemptThreshold(installmentAmount)
  );
}

export function sumPreGraceInstallmentPrincipalPaid(
  dueDate: string,
  installmentId: string,
  allocations: MamDemoDb['payment_allocations'],
  paymentDateById: ReadonlyMap<string, string>
): number {
  const lateFeeStart = getLateFeeStartDate(dueDate);
  let sum = 0;
  for (const alloc of allocations) {
    if (alloc.installment_id !== installmentId) continue;
    if (!INSTALLMENT_PRINCIPAL_ALLOC_TYPES.has(alloc.allocation_type)) continue;
    const paymentDate = paymentDateById.get(alloc.payment_id);
    if (!paymentDate) continue;
    if (compareDateOnly(normalizeDate(paymentDate), lateFeeStart) >= 0) {
      continue;
    }
    sum += alloc.amount;
  }
  return roundLKR(sum);
}

function sumPendingPreGraceInstallmentPrincipal(
  dueDate: string,
  installmentId: string,
  paymentDate: string,
  pendingAllocations: PaymentAllocationLine[]
): number {
  const lateFeeStart = getLateFeeStartDate(dueDate);
  if (compareDateOnly(normalizeDate(paymentDate), lateFeeStart) >= 0) {
    return 0;
  }
  let sum = 0;
  for (const line of pendingAllocations) {
    if (line.installmentId !== installmentId) continue;
    if (!INSTALLMENT_PRINCIPAL_ALLOC_TYPES.has(line.allocationType)) continue;
    sum += line.amount;
  }
  return roundLKR(sum);
}

export function buildLateFeeExemptByInstallmentId(
  db: MamDemoDb,
  loanId: string
): Map<string, boolean> {
  const installments = db.loan_installments.filter((i) => i.loan_id === loanId);
  const allocations = db.payment_allocations.filter((a) => a.loan_id === loanId);
  const payments = db.loan_payments.filter(
    (p) => p.loan_id === loanId && p.status === 'CONFIRMED'
  );
  const paymentDateById = new Map(payments.map((p) => [p.id, p.payment_date]));

  const exempt = new Map<string, boolean>();
  for (const inst of installments) {
    const preGrace = sumPreGraceInstallmentPrincipalPaid(
      inst.due_date,
      inst.id,
      allocations,
      paymentDateById
    );
    if (
      isLateFeeExemptByHalfPreGracePayment(inst.installment_amount, preGrace)
    ) {
      exempt.set(inst.id, true);
    }
  }
  return exempt;
}

/** Extend a history-based exempt map with installment lines from an in-flight payment. */
export function applyPendingPaymentToLateFeeExemptMap(
  base: Map<string, boolean>,
  installments: Array<{
    id: string;
    dueDate: string;
    installmentAmount: number;
  }>,
  paymentDate: string,
  pendingAllocations: PaymentAllocationLine[],
  db: MamDemoDb,
  loanId: string
): Map<string, boolean> {
  const result = new Map(base);
  const allocations = db.payment_allocations.filter((a) => a.loan_id === loanId);
  const payments = db.loan_payments.filter(
    (p) => p.loan_id === loanId && p.status === 'CONFIRMED'
  );
  const paymentDateById = new Map(payments.map((p) => [p.id, p.payment_date]));

  for (const inst of installments) {
    if (result.get(inst.id)) continue;
    const preGrace = roundLKR(
      sumPreGraceInstallmentPrincipalPaid(
        inst.dueDate,
        inst.id,
        allocations,
        paymentDateById
      ) +
        sumPendingPreGraceInstallmentPrincipal(
          inst.dueDate,
          inst.id,
          paymentDate,
          pendingAllocations
        )
    );
    if (
      isLateFeeExemptByHalfPreGracePayment(inst.installmentAmount, preGrace)
    ) {
      result.set(inst.id, true);
    }
  }
  return result;
}

/** Payment date is still before late-fee accrual for at least one installment. */
export function paymentMayAffectLateFeeExemption(
  installments: Array<{ dueDate: string }>,
  paymentDate: string
): boolean {
  const pay = normalizeDate(paymentDate);
  return installments.some(
    (inst) => compareDateOnly(pay, getLateFeeStartDate(inst.dueDate)) < 0
  );
}

export function toLateFeeExemptRecord(
  map: Map<string, boolean>
): Record<string, boolean> {
  return Object.fromEntries(map);
}

export function recordToLateFeeExemptMap(
  record?: Readonly<Record<string, boolean>>
): Map<string, boolean> {
  const map = new Map<string, boolean>();
  if (!record) return map;
  for (const [id, exempt] of Object.entries(record)) {
    if (exempt) map.set(id, true);
  }
  return map;
}

export function createLateFeeExemptAfterAllocationFn(
  db: MamDemoDb,
  loanId: string,
  baseExempt: Readonly<Record<string, boolean>>,
  installments: Array<{
    id: string;
    dueDate: string;
    installmentAmount: number;
  }>,
  paymentDate: string
): LateFeeExemptAfterAllocationFn {
  return (pendingAllocations) =>
    toLateFeeExemptRecord(
      applyPendingPaymentToLateFeeExemptMap(
        recordToLateFeeExemptMap(baseExempt),
        installments,
        paymentDate,
        pendingAllocations,
        db,
        loanId
      )
    );
}
