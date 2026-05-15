import type { PaymentAllocationResult } from './paymentAllocation';
import { calculateNextCycleInterestDue } from './interestOnly';
import { roundLKR } from './money';

/** Common payment receipt fields (local demo) */
export interface PaymentReceiptCashDiscount {
  cashReceived: number;
  discountApplied: number;
  totalApplied: number;
}

/** Receipt breakdown for interest-only / reducing principal payments. */
export interface InterestOnlyReceiptBreakdown extends PaymentReceiptCashDiscount {
  interestPaid: number;
  principalPaid: number;
  remainingPrincipal: number;
  pendingInterestRemaining: number;
  nextEstimatedInterest: number;
}

/** Receipt breakdown for fixed-term installment payments. */
export interface FixedInstallmentReceiptBreakdown extends PaymentReceiptCashDiscount {
  lateFeePaid: number;
  installmentPaid: number;
  advancePaid: number;
  remainingArrears: number;
  loanBalance: number;
}

export function buildInterestOnlyReceipt(
  allocation: PaymentAllocationResult,
  monthlyInterestRatePercent: number,
  cashReceived: number,
  discountApplied: number
): InterestOnlyReceiptBreakdown {
  const remainingPrincipal = allocation.summary.newPrincipal ?? 0;
  const totalApplied = roundLKR(cashReceived + discountApplied);
  return {
    cashReceived,
    discountApplied,
    totalApplied,
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
  totalArrearsBefore: number,
  cashReceived: number,
  discountApplied: number
): FixedInstallmentReceiptBreakdown {
  const lateFeePaid = allocation.summary.lateFeesPaid ?? 0;
  const installmentPaid = roundLKR(
    (allocation.summary.installmentsPaid ?? 0) +
      (allocation.summary.currentMonthPaid ?? 0)
  );
  const totalApplied = roundLKR(cashReceived + discountApplied);
  const paidTowardArrears = roundLKR(lateFeePaid + installmentPaid);
  const remainingArrears = roundLKR(
    Math.max(0, totalArrearsBefore - paidTowardArrears)
  );
  const loanBalance = roundLKR(
    Math.max(0, loanBalanceBefore - allocation.totalAllocated)
  );

  return {
    cashReceived,
    discountApplied,
    totalApplied,
    lateFeePaid,
    installmentPaid,
    advancePaid: allocation.summary.advanceAmount ?? 0,
    remainingArrears,
    loanBalance,
  };
}
