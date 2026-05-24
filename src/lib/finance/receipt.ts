import type { PaymentAllocationResult } from './paymentAllocation';
import {
  allocatePaymentBreakdown,
  summarizeFixedInstallmentPaid,
} from './paymentAllocation';
import { calculateNextCycleInterestDue } from './interestOnly';
import { computeLoanLateFeesV3 } from './lateFeeEngineV3';
import { roundLKR } from './money';

/** Common payment receipt fields (local demo) */
export interface PaymentReceiptCashDiscount {
  cashReceived: number;
  discountApplied: number;
  /** Cash + waiver applied toward due (installment settled), not customer cash total. */
  totalApplied: number;
}

/** Receipt breakdown for interest-only / reducing principal payments. */
export interface InterestOnlyReceiptBreakdown extends PaymentReceiptCashDiscount {
  interestPaid: number;
  principalPaid: number;
  remainingPrincipal: number;
  pendingInterestRemaining: number;
  nextEstimatedInterest: number;
  previousBalance: number;
  installmentApplied: number;
}

export interface LateFeeReceiptLine {
  installmentNumber: number;
  dueDate: string;
  overdueMonths: number;
  lateFee: number;
}

/** Receipt breakdown for fixed-term installment payments. */
export interface FixedInstallmentReceiptBreakdown extends PaymentReceiptCashDiscount {
  lateFeePaid: number;
  installmentPaid: number;
  advancePaid: number;
  remainingArrears: number;
  previousBalance: number;
  installmentApplied: number;
  loanBalance: number;
  totalLateFeeDue?: number;
  lateFeeBreakdown?: LateFeeReceiptLine[];
}

export function buildLateFeeReceiptLines(
  monthlyInstallment: number,
  lateFeeRate: number,
  paymentDate: string,
  schedule: Array<{
    id?: string;
    installmentNumber: number;
    dueDate: string;
    installmentAmount: number;
    paidAmount: number;
    lateFeePaid?: number;
  }>
): { totalLateFeeDue: number; lines: LateFeeReceiptLine[] } {
  const engine = computeLoanLateFeesV3({
    monthlyInstallment,
    lateFeeRatePercent: lateFeeRate,
    paymentDate,
    installments: schedule.map((row, index) => ({
      installmentId: row.id ?? `rcp-${row.installmentNumber}-${index}`,
      installmentNumber: row.installmentNumber,
      dueDate: row.dueDate,
      installmentAmount: row.installmentAmount,
      paidAmount: row.paidAmount,
      lateFeePaid: row.lateFeePaid,
    })),
  });
  const lines = engine.lines
    .filter((i) => i.lateFeeOutstanding > 0 || i.lateFee > 0)
    .map((i) => ({
      installmentNumber: i.installmentNumber,
      dueDate: i.dueDate,
      overdueMonths: i.lateMonths,
      lateFee: i.lateFeeOutstanding > 0 ? i.lateFeeOutstanding : i.lateFee,
    }));
  return {
    totalLateFeeDue: engine.totalLateFeeOutstanding,
    lines,
  };
}

export function buildInterestOnlyReceipt(
  allocation: PaymentAllocationResult,
  monthlyInterestRatePercent: number,
  principalBefore: number,
  cashReceived: number,
  discountApplied: number
): InterestOnlyReceiptBreakdown {
  const totalApplied = roundLKR(cashReceived + discountApplied);
  const breakdown = allocatePaymentBreakdown(allocation, {
    loanBalanceBefore: principalBefore,
    totalPaid: totalApplied,
    isInterestOnly: true,
  });
  const remainingPrincipal = breakdown.remainingBalance;
  return {
    cashReceived,
    discountApplied,
    totalApplied,
    interestPaid: breakdown.interestPaid,
    principalPaid: breakdown.principalPaid,
    remainingPrincipal,
    pendingInterestRemaining:
      allocation.summary.pendingInterestRemaining ?? 0,
    nextEstimatedInterest: calculateNextCycleInterestDue(
      remainingPrincipal,
      monthlyInterestRatePercent
    ),
    previousBalance: breakdown.previousBalance,
    installmentApplied: breakdown.principalPaid,
  };
}

/** Balance fields for display — supports receipts saved before balance fields were stored. */
export function getReceiptBalanceDisplay(
  receipt: FixedInstallmentReceiptBreakdown | InterestOnlyReceiptBreakdown
): {
  previousBalance: number;
  installmentApplied: number;
  newBalance: number;
} {
  if ('loanBalance' in receipt) {
    const installmentApplied =
      'installmentApplied' in receipt && receipt.installmentApplied != null
        ? receipt.installmentApplied
        : receipt.installmentPaid;
    const previousBalance =
      'previousBalance' in receipt && receipt.previousBalance != null
        ? receipt.previousBalance
        : roundLKR(receipt.loanBalance + installmentApplied);
    return {
      previousBalance,
      installmentApplied,
      newBalance: receipt.loanBalance,
    };
  }
  const installmentApplied =
    'installmentApplied' in receipt && receipt.installmentApplied != null
      ? receipt.installmentApplied
      : receipt.principalPaid;
  const newBalance = receipt.remainingPrincipal;
  const previousBalance =
    'previousBalance' in receipt && receipt.previousBalance != null
      ? receipt.previousBalance
      : roundLKR(newBalance + installmentApplied);
  return { previousBalance, installmentApplied, newBalance };
}

export function buildFixedInstallmentReceipt(
  allocation: PaymentAllocationResult,
  loanBalanceBefore: number,
  totalArrearsBefore: number,
  cashReceived: number,
  discountApplied: number,
  lateFeeContext?: {
    monthlyInstallment: number;
    lateFeeRate: number;
    paymentDate: string;
    schedule: Array<{
      id?: string;
      installmentNumber: number;
      dueDate: string;
      installmentAmount: number;
      paidAmount: number;
      lateFeePaid?: number;
    }>;
  }
): FixedInstallmentReceiptBreakdown {
  const totalApplied = roundLKR(cashReceived + discountApplied);
  const breakdown = allocatePaymentBreakdown(allocation, {
    loanBalanceBefore,
    totalPaid: totalApplied,
    isInterestOnly: false,
  });
  const { lateFeePaid, installmentPaid } = summarizeFixedInstallmentPaid(
    allocation.summary
  );
  const paidTowardArrears = roundLKR(lateFeePaid + installmentPaid);
  const remainingArrears = roundLKR(
    Math.max(0, totalArrearsBefore - paidTowardArrears)
  );

  let totalLateFeeDue: number | undefined;
  let lateFeeBreakdown: LateFeeReceiptLine[] | undefined;
  if (lateFeeContext) {
    const lf = buildLateFeeReceiptLines(
      lateFeeContext.monthlyInstallment,
      lateFeeContext.lateFeeRate,
      lateFeeContext.paymentDate,
      lateFeeContext.schedule
    );
    totalLateFeeDue = lf.totalLateFeeDue;
    lateFeeBreakdown =
      lf.lines.length > 0 ? lf.lines : undefined;
  }

  return {
    cashReceived,
    discountApplied,
    totalApplied,
    lateFeePaid,
    installmentPaid,
    advancePaid: breakdown.advancePaid,
    remainingArrears,
    previousBalance: breakdown.previousBalance,
    installmentApplied: installmentPaid,
    loanBalance: breakdown.remainingBalance,
    totalLateFeeDue,
    lateFeeBreakdown,
  };
}
