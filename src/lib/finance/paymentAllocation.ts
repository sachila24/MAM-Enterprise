import { DEFAULT_LATE_FEE_RATE_PERCENT } from './constants';
import { calculateLateFee, monthsLate } from './fixedInstallment';
import {
  allocateInterestOnlyPayment,
  type InterestCycleForAllocation,
  totalPendingInterest,
} from './interestOnly';
import { roundLKR } from './money';

export type AllocationType =
  | 'INTEREST'
  | 'PRINCIPAL'
  | 'INSTALLMENT'
  | 'LATE_FEE'
  | 'ADVANCE'
  | 'SETTLEMENT';

export interface PaymentAllocationLine {
  allocationType: AllocationType;
  installmentId?: string;
  interestCycleId?: string;
  amount: number;
  installmentNumber?: number;
  cycleNumber?: number;
}

export interface InstallmentForAllocation {
  id: string;
  installmentNumber: number;
  dueDate: string;
  installmentAmount: number;
  paidAmount: number;
  lateFeeAmount: number;
  lateFeePaid: number;
}

export interface InterestOnlyAllocationContext {
  currentPrincipal: number;
  monthlyInterestRatePercent: number;
  /** Open interest cycles (oldest unpaid interest first). */
  cycles: InterestCycleForAllocation[];
}

export interface FixedInstallmentAllocationContext {
  installments: InstallmentForAllocation[];
  paymentDate: string;
  /** Defaults to {@link DEFAULT_LATE_FEE_RATE_PERCENT} when omitted. */
  lateFeeRatePercent?: number;
  currentInstallmentNumber: number;
  loanBalanceAmount: number;
}

export interface PaymentAllocationResult {
  allocations: PaymentAllocationLine[];
  totalAllocated: number;
  unallocated: number;
  summary: {
    lateFeesPaid: number;
    installmentsPaid: number;
    currentMonthPaid: number;
    advanceAmount: number;
    interestPaid?: number;
    principalPaid?: number;
    newPrincipal?: number;
    pendingInterestRemaining?: number;
    nextEstimatedInterest?: number;
    totalDueBeforePayment?: number;
    arrearsRemainingAfter?: number;
    loanBalanceAfter?: number;
  };
}

function installmentOutstanding(inst: InstallmentForAllocation): number {
  return roundLKR(Math.max(0, inst.installmentAmount - inst.paidAmount));
}

function lateFeeOutstanding(inst: InstallmentForAllocation): number {
  return roundLKR(Math.max(0, inst.lateFeeAmount - inst.lateFeePaid));
}

/** Interest-only: pending/current interest (oldest first), then principal. No late fees. */
export function allocateInterestOnlyPaymentLines(
  ctx: InterestOnlyAllocationContext,
  paymentAmount: number
): PaymentAllocationResult {
  const result = allocateInterestOnlyPayment(
    ctx.currentPrincipal,
    ctx.monthlyInterestRatePercent,
    paymentAmount,
    ctx.cycles
  );

  const allocations: PaymentAllocationLine[] = [];

  for (const ca of result.cycleAllocations) {
    allocations.push({
      allocationType: 'INTEREST',
      interestCycleId: ca.cycleId,
      cycleNumber: ca.cycleNumber,
      amount: ca.amount,
    });
  }

  if (
    result.interestPaid > 0 &&
    result.cycleAllocations.length === 0
  ) {
    allocations.push({
      allocationType: 'INTEREST',
      amount: result.interestPaid,
    });
  }

  if (result.principalPaid > 0) {
    allocations.push({
      allocationType: 'PRINCIPAL',
      amount: result.principalPaid,
    });
  }

  if (result.unallocated > 0) {
    allocations.push({
      allocationType: 'ADVANCE',
      amount: result.unallocated,
    });
  }

  const nextEstimatedInterest =
    result.newPrincipal > 0
      ? roundLKR(
          result.newPrincipal * (ctx.monthlyInterestRatePercent / 100)
        )
      : 0;

  return {
    allocations,
    totalAllocated: roundLKR(paymentAmount - result.unallocated),
    unallocated: result.unallocated,
    summary: {
      lateFeesPaid: 0,
      installmentsPaid: 0,
      currentMonthPaid: 0,
      advanceAmount: result.unallocated,
      interestPaid: result.interestPaid,
      principalPaid: result.principalPaid,
      newPrincipal: result.newPrincipal,
      pendingInterestRemaining: result.pendingInterestRemaining,
      nextEstimatedInterest,
      totalDueBeforePayment: result.totalInterestDue,
    },
  };
}

export interface FixedInstallmentDueSummary {
  totalLateFeesDue: number;
  totalArrearsInstallmentsDue: number;
  currentMonthDue: number;
  totalDue: number;
}

/** Amounts due before payment (for payment screen and receipt context). */
export function summarizeFixedInstallmentDue(
  ctx: Omit<FixedInstallmentAllocationContext, 'loanBalanceAmount'>,
  asOfDate: string = ctx.paymentDate
): FixedInstallmentDueSummary {
  const lateFeeRate =
    ctx.lateFeeRatePercent ?? DEFAULT_LATE_FEE_RATE_PERCENT;
  const sorted = [...ctx.installments].sort(
    (a, b) => a.installmentNumber - b.installmentNumber
  );

  let totalLateFeesDue = 0;
  let totalArrearsInstallmentsDue = 0;
  let currentMonthDue = 0;

  for (const inst of sorted) {
    const instOwed = installmentOutstanding(inst);
    const months = monthsLate(inst.dueDate, asOfDate);
    const lateOwed =
      instOwed > 0 && months > 0
        ? Math.max(
            lateFeeOutstanding(inst),
            calculateLateFee({
              installmentAmount: inst.installmentAmount,
              lateFeeRatePercent: lateFeeRate,
              monthsLate: months,
            }) - inst.lateFeePaid
          )
        : lateFeeOutstanding(inst);
    totalLateFeesDue = roundLKR(totalLateFeesDue + lateOwed);

    if (inst.installmentNumber < ctx.currentInstallmentNumber) {
      totalArrearsInstallmentsDue = roundLKR(
        totalArrearsInstallmentsDue + instOwed
      );
    } else if (inst.installmentNumber === ctx.currentInstallmentNumber) {
      currentMonthDue = instOwed;
    }
  }

  return {
    totalLateFeesDue,
    totalArrearsInstallmentsDue,
    currentMonthDue,
    totalDue: roundLKR(
      totalLateFeesDue + totalArrearsInstallmentsDue + currentMonthDue
    ),
  };
}

/**
 * Fixed installment waterfall:
 * 1. Late fees (oldest)
 * 2. Old arrears installments
 * 3. Current month installment
 * 4. Advance / extra
 */
export function allocateFixedInstallmentPayment(
  ctx: FixedInstallmentAllocationContext,
  paymentAmount: number
): PaymentAllocationResult {
  const lateFeeRate =
    ctx.lateFeeRatePercent ?? DEFAULT_LATE_FEE_RATE_PERCENT;
  const dueBefore = summarizeFixedInstallmentDue(ctx);

  let remaining = paymentAmount;
  const allocations: PaymentAllocationLine[] = [];
  let lateFeesPaid = 0;
  let installmentsPaid = 0;
  let currentMonthPaid = 0;

  const sorted = [...ctx.installments].sort(
    (a, b) => a.installmentNumber - b.installmentNumber
  );

  const withLateFees = sorted.map((inst) => {
    const outstanding = installmentOutstanding(inst);
    const months = monthsLate(inst.dueDate, ctx.paymentDate);
    const computedLate =
      outstanding > 0 && months > 0
        ? calculateLateFee({
            installmentAmount: inst.installmentAmount,
            lateFeeRatePercent: lateFeeRate,
            monthsLate: months,
          })
        : 0;
    const lateFeeAmount = Math.max(inst.lateFeeAmount, computedLate);
    return { ...inst, lateFeeAmount };
  });

  for (const inst of withLateFees) {
    const owed = lateFeeOutstanding(inst);
    if (owed <= 0 || remaining <= 0) continue;
    const pay = roundLKR(Math.min(remaining, owed));
    allocations.push({
      allocationType: 'LATE_FEE',
      installmentId: inst.id,
      installmentNumber: inst.installmentNumber,
      amount: pay,
    });
    lateFeesPaid = roundLKR(lateFeesPaid + pay);
    remaining = roundLKR(remaining - pay);
  }

  for (const inst of withLateFees) {
    if (inst.installmentNumber >= ctx.currentInstallmentNumber) continue;
    const owed = installmentOutstanding(inst);
    if (owed <= 0 || remaining <= 0) continue;
    const pay = roundLKR(Math.min(remaining, owed));
    allocations.push({
      allocationType: 'INSTALLMENT',
      installmentId: inst.id,
      installmentNumber: inst.installmentNumber,
      amount: pay,
    });
    installmentsPaid = roundLKR(installmentsPaid + pay);
    remaining = roundLKR(remaining - pay);
  }

  const current = withLateFees.find(
    (i) => i.installmentNumber === ctx.currentInstallmentNumber
  );
  if (current && remaining > 0) {
    const owed = installmentOutstanding(current);
    const pay = roundLKR(Math.min(remaining, owed));
    if (pay > 0) {
      allocations.push({
        allocationType: 'INSTALLMENT',
        installmentId: current.id,
        installmentNumber: current.installmentNumber,
        amount: pay,
      });
      currentMonthPaid = pay;
      remaining = roundLKR(remaining - pay);
    }
  }

  for (const inst of withLateFees) {
    if (inst.installmentNumber <= ctx.currentInstallmentNumber) continue;
    const owed = installmentOutstanding(inst);
    if (owed <= 0 || remaining <= 0) continue;
    const pay = roundLKR(Math.min(remaining, owed));
    allocations.push({
      allocationType: 'INSTALLMENT',
      installmentId: inst.id,
      installmentNumber: inst.installmentNumber,
      amount: pay,
    });
    installmentsPaid = roundLKR(installmentsPaid + pay);
    remaining = roundLKR(remaining - pay);
  }

  let advanceAmount = 0;
  if (remaining > 0) {
    allocations.push({ allocationType: 'ADVANCE', amount: remaining });
    advanceAmount = remaining;
    remaining = 0;
  }

  const paidTowardDue = roundLKR(paymentAmount - advanceAmount - remaining);
  const arrearsRemainingAfter = roundLKR(
    Math.max(0, dueBefore.totalDue - paidTowardDue)
  );
  const loanBalanceAfter = roundLKR(
    Math.max(0, ctx.loanBalanceAmount - paidTowardDue)
  );

  return {
    allocations,
    totalAllocated: roundLKR(paymentAmount - remaining),
    unallocated: remaining,
    summary: {
      lateFeesPaid,
      installmentsPaid,
      currentMonthPaid,
      advanceAmount,
      totalDueBeforePayment: dueBefore.totalDue,
      arrearsRemainingAfter,
      loanBalanceAfter,
    },
  };
}

export { totalPendingInterest };
