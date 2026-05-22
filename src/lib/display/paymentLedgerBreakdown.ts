import { roundLKR } from '../finance/money';
import type { PaymentAllocationResult } from '../finance/paymentAllocation';
import type { DbPaymentAllocation } from '../local-db/types';

export interface PaymentLedgerBreakdown {
  installmentPaid: number;
  lateFeePaid: number;
  interestPaid: number;
  principalPaid: number;
  totalApplied: number;
}

/** Summarize allocation lines into permanent payment breakdown (display + persistence). */
export function summarizePaymentBreakdown(
  lines: PaymentAllocationResult['allocations']
): PaymentLedgerBreakdown {
  let installmentPaid = 0;
  let lateFeePaid = 0;
  let interestPaid = 0;
  let principalPaid = 0;

  for (const line of lines) {
    if (line.amount <= 0) continue;
    switch (line.allocationType) {
      case 'INSTALLMENT':
      case 'INSTALLMENT_DISCOUNT':
        installmentPaid += line.amount;
        break;
      case 'LATE_FEE':
      case 'LATE_FEE_DISCOUNT':
        lateFeePaid += line.amount;
        break;
      case 'INTEREST':
      case 'INTEREST_DISCOUNT':
        interestPaid += line.amount;
        break;
      case 'PRINCIPAL':
      case 'PRINCIPAL_DISCOUNT':
        principalPaid += line.amount;
        break;
      default:
        break;
    }
  }

  const installmentPaidR = roundLKR(installmentPaid);
  const lateFeePaidR = roundLKR(lateFeePaid);
  const interestPaidR = roundLKR(interestPaid);
  const principalPaidR = roundLKR(principalPaid);

  return {
    installmentPaid: installmentPaidR,
    lateFeePaid: lateFeePaidR,
    interestPaid: interestPaidR,
    principalPaid: principalPaidR,
    totalApplied: roundLKR(
      installmentPaidR + lateFeePaidR + interestPaidR + principalPaidR
    ),
  };
}

/**
 * Persisted late-fee charged amount — never below paid or a prior snapshot.
 * (Recording layer only; does not change late-fee engine math.)
 */
export function preserveLateFeeChargedAmount(
  storedAmount: number,
  computedAmount: number,
  paidAmount: number
): number {
  return roundLKR(Math.max(storedAmount, computedAmount, paidAmount));
}

/** Rebuild breakdown from stored allocation rows (historical payments). */
export function breakdownFromDbAllocations(
  allocations: DbPaymentAllocation[]
): PaymentLedgerBreakdown {
  return summarizePaymentBreakdown(
    allocations.map((a) => ({
      allocationType: a.allocation_type,
      amount: a.amount,
      installmentId: a.installment_id,
      interestCycleId: a.interest_cycle_id,
    }))
  );
}
