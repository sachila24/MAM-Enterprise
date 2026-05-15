import type { PaymentAllocationResult } from './paymentAllocation';
import { calculateNextCycleInterestDue } from './interestOnly';
import { roundLKR } from './money';

/** Receipt breakdown for interest-only / reducing principal payments. */
export interface InterestOnlyReceiptBreakdown {
  interestPaid: number;
  principalPaid: number;
  remainingPrincipal: number;
  pendingInterestRemaining: number;
  nextEstimatedInterest: number;
}

/** Receipt breakdown for fixed-term installment payments. */
export interface FixedInstallmentReceiptBreakdown {
  lateFeePaid: number;
  installmentPaid: number;
  remainingArrears: number;
  loanBalance: number;
}

export function buildInterestOnlyReceipt(
  allocation: PaymentAllocationResult,
  monthlyInterestRatePercent: number
): InterestOnlyReceiptBreakdown {
  const remainingPrincipal = allocation.summary.newPrincipal ?? 0;
  return {
    interestPaid: allocation.summary.interestPaid ?? 0,
    principalPaid: allocation.summary.principalPaid ?? 0,
    remainingPrincipal,
    pendingInterestRemaining:
      allocation.summary.pendingInterestRemaining ?? 0,
    nextEstimatedInterest: calculateNextCycleInterestDue(
      remainingPrincipal,
      monthlyInterestRatePercent
    ),
  };
}

export function buildFixedInstallmentReceipt(
  allocation: PaymentAllocationResult,
  loanBalanceBefore: number,
  totalArrearsBefore: number
): FixedInstallmentReceiptBreakdown {
  const lateFeePaid = allocation.summary.lateFeesPaid ?? 0;
  const installmentPaid = roundLKR(
    (allocation.summary.installmentsPaid ?? 0) +
      (allocation.summary.currentMonthPaid ?? 0)
  );
  const paidTowardArrears = roundLKR(lateFeePaid + installmentPaid);
  const remainingArrears = roundLKR(
    Math.max(0, totalArrearsBefore - paidTowardArrears)
  );
  const loanBalance = roundLKR(
    Math.max(0, loanBalanceBefore - allocation.totalAllocated)
  );

  return {
    lateFeePaid,
    installmentPaid,
    remainingArrears,
    loanBalance,
  };
}
