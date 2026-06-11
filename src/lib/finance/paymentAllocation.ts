import { DEFAULT_LATE_FEE_RATE_PERCENT } from './constants';
import {
  isInstallmentInArrears,
  resolveCurrentInstallmentNumber,
  runLateFeeEngine,
  type InstallmentArrearsInput,
} from './fixedInstallmentStatus';
import { getLateFeeLineByInstallmentId } from './lateFeeEngineV3';
import {
  paymentMayAffectLateFeeExemption,
  type LateFeeExemptAfterAllocationFn,
} from './lateFeeExemption';

export type { LateFeeExemptAfterAllocationFn };
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
  | 'SETTLEMENT'
  | 'INTEREST_DISCOUNT'
  | 'PRINCIPAL_DISCOUNT'
  | 'INSTALLMENT_DISCOUNT'
  | 'LATE_FEE_DISCOUNT';

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
  /** Standard monthly installment for base late-fee unit (defaults to first line amount). */
  monthlyInstallmentAmount?: number;
  currentInstallmentNumber: number;
  loanBalanceAmount: number;
  /** Per-installment 50% pre-grace exemption (fixed-term loans only). */
  lateFeeExemptByInstallmentId?: Readonly<Record<string, boolean>>;
  /** Optional second-pass exemption update (includes in-flight installment allocations). */
  recomputeLateFeeExemptAfterAllocation?: LateFeeExemptAfterAllocationFn;
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

/** Canonical breakdown after allocation (receipt + balance updates). */
export interface PaymentAllocationBreakdown {
  lateFeePaid: number;
  installmentPaid: number;
  interestPaid: number;
  principalPaid: number;
  advancePaid: number;
  totalPaid: number;
  previousBalance: number;
  remainingBalance: number;
}

export function summarizeFixedInstallmentPaid(
  summary: Pick<
    PaymentAllocationResult['summary'],
    'lateFeesPaid' | 'installmentsPaid' | 'currentMonthPaid'
  >
): { lateFeePaid: number; installmentPaid: number } {
  const lateFeePaid = summary.lateFeesPaid ?? 0;
  const installmentPaid = roundLKR(
    (summary.installmentsPaid ?? 0) + (summary.currentMonthPaid ?? 0)
  );
  return { lateFeePaid, installmentPaid };
}

/** Loan balance after payment — installment portion only (late fees excluded). */
export function computeFixedLoanBalanceAfter(
  loanBalanceBefore: number,
  summary: Pick<
    PaymentAllocationResult['summary'],
    'lateFeesPaid' | 'installmentsPaid' | 'currentMonthPaid'
  >
): number {
  const { installmentPaid } = summarizeFixedInstallmentPaid(summary);
  return roundLKR(Math.max(0, loanBalanceBefore - installmentPaid));
}

export function buildFixedPaymentBreakdown(
  allocation: PaymentAllocationResult,
  loanBalanceBefore: number,
  totalPaid: number
): PaymentAllocationBreakdown {
  const { lateFeePaid, installmentPaid } = summarizeFixedInstallmentPaid(
    allocation.summary
  );
  return {
    lateFeePaid,
    installmentPaid,
    interestPaid: 0,
    principalPaid: 0,
    advancePaid: allocation.summary.advanceAmount ?? 0,
    totalPaid,
    previousBalance: loanBalanceBefore,
    remainingBalance: computeFixedLoanBalanceAfter(
      loanBalanceBefore,
      allocation.summary
    ),
  };
}

export function buildInterestOnlyPaymentBreakdown(
  allocation: PaymentAllocationResult,
  principalBefore: number,
  totalPaid: number
): PaymentAllocationBreakdown {
  const interestPaid = allocation.summary.interestPaid ?? 0;
  const principalPaid = allocation.summary.principalPaid ?? 0;
  return {
    lateFeePaid: 0,
    installmentPaid: 0,
    interestPaid,
    principalPaid,
    advancePaid: allocation.summary.advanceAmount ?? 0,
    totalPaid,
    previousBalance: principalBefore,
    remainingBalance: allocation.summary.newPrincipal ?? principalBefore,
  };
}

/** Receipt-facing breakdown from an allocation result. */
export function allocatePaymentBreakdown(
  allocation: PaymentAllocationResult,
  opts: { loanBalanceBefore: number; totalPaid: number; isInterestOnly: boolean }
): PaymentAllocationBreakdown {
  return opts.isInterestOnly
    ? buildInterestOnlyPaymentBreakdown(
        allocation,
        opts.loanBalanceBefore,
        opts.totalPaid
      )
    : buildFixedPaymentBreakdown(
        allocation,
        opts.loanBalanceBefore,
        opts.totalPaid
      );
}

function installmentOutstanding(inst: InstallmentForAllocation): number {
  return roundLKR(Math.max(0, inst.installmentAmount - inst.paidAmount));
}

function resolveMonthlyInstallmentAmount(
  ctx: Pick<FixedInstallmentAllocationContext, 'installments' | 'monthlyInstallmentAmount'>
): number {
  if (ctx.monthlyInstallmentAmount != null && ctx.monthlyInstallmentAmount > 0) {
    return ctx.monthlyInstallmentAmount;
  }
  const sorted = [...ctx.installments].sort(
    (a, b) => a.installmentNumber - b.installmentNumber
  );
  const regular = sorted.find(
    (i) => i.installmentNumber < sorted[sorted.length - 1]?.installmentNumber
  );
  return regular?.installmentAmount ?? sorted[0]?.installmentAmount ?? 0;
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
  ) as InstallmentArrearsInput[];

  const monthlyInstallment = resolveMonthlyInstallmentAmount(ctx);
  const engine = runLateFeeEngine(
    sorted.map((i) => ({
      ...i,
      lateFeeAmount: i.lateFeeAmount,
      lateFeePaid: i.lateFeePaid,
    })),
    monthlyInstallment,
    lateFeeRate,
    {
      paymentDate: asOfDate,
      lateFeeExemptByInstallmentId: ctx.lateFeeExemptByInstallmentId,
    }
  );
  const currentNum =
    ctx.currentInstallmentNumber ??
    resolveCurrentInstallmentNumber(sorted, asOfDate);

  let currentMonthDue = 0;
  const current = sorted.find((i) => i.installmentNumber === currentNum);
  if (current && !isInstallmentInArrears(current, asOfDate)) {
    currentMonthDue = installmentOutstanding(current);
  }

  const totalLateFeesDue = engine.totalLateFeeOutstanding;
  const totalArrearsInstallmentsDue = engine.totalInstallmentDue;

  return {
    totalLateFeesDue,
    totalArrearsInstallmentsDue,
    currentMonthDue,
    totalDue: engine.totalOutstanding,
  };
}

/**
 * Fixed installment waterfall (oldest month first):
 * For each installment in order: late fee, then installment principal.
 * Advance / extra only after all due buckets are satisfied.
 */
function allocateFixedInstallmentPaymentOnce(
  ctx: FixedInstallmentAllocationContext,
  paymentAmount: number,
  dueBefore: ReturnType<typeof summarizeFixedInstallmentDue>
): PaymentAllocationResult {
  const lateFeeRate =
    ctx.lateFeeRatePercent ?? DEFAULT_LATE_FEE_RATE_PERCENT;

  let remaining = paymentAmount;
  const allocations: PaymentAllocationLine[] = [];
  let lateFeesPaid = 0;
  let installmentsPaid = 0;
  let currentMonthPaid = 0;

  const sorted = [...ctx.installments].sort(
    (a, b) => a.installmentNumber - b.installmentNumber
  );

  const monthlyInstallment = resolveMonthlyInstallmentAmount(ctx);
  const engine = runLateFeeEngine(
    sorted.map((i) => ({
      ...i,
      lateFeeAmount: i.lateFeeAmount,
      lateFeePaid: i.lateFeePaid,
    })),
    monthlyInstallment,
    lateFeeRate,
    {
      paymentDate: ctx.paymentDate,
      lateFeeExemptByInstallmentId: ctx.lateFeeExemptByInstallmentId,
    }
  );

  for (const inst of sorted) {
    if (remaining <= 0) break;

    const line = getLateFeeLineByInstallmentId(engine, inst.id);
    const lateOwed = line?.lateFeeOutstanding ?? 0;
    if (lateOwed > 0) {
      const pay = roundLKR(Math.min(remaining, lateOwed));
      allocations.push({
        allocationType: 'LATE_FEE',
        installmentId: inst.id,
        installmentNumber: inst.installmentNumber,
        amount: pay,
      });
      lateFeesPaid = roundLKR(lateFeesPaid + pay);
      remaining = roundLKR(remaining - pay);
    }

    if (remaining <= 0) break;

    const instOwed = installmentOutstanding(inst);
    if (instOwed > 0) {
      const pay = roundLKR(Math.min(remaining, instOwed));
      allocations.push({
        allocationType: 'INSTALLMENT',
        installmentId: inst.id,
        installmentNumber: inst.installmentNumber,
        amount: pay,
      });
      if (inst.installmentNumber === ctx.currentInstallmentNumber) {
        currentMonthPaid = roundLKR(currentMonthPaid + pay);
      } else {
        installmentsPaid = roundLKR(installmentsPaid + pay);
      }
      remaining = roundLKR(remaining - pay);
    }
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
  const loanBalanceAfter = computeFixedLoanBalanceAfter(ctx.loanBalanceAmount, {
    lateFeesPaid,
    installmentsPaid,
    currentMonthPaid,
  });

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

export function allocateFixedInstallmentPayment(
  ctx: FixedInstallmentAllocationContext,
  paymentAmount: number
): PaymentAllocationResult {
  const dueBefore = summarizeFixedInstallmentDue(ctx);
  const firstPass = allocateFixedInstallmentPaymentOnce(
    ctx,
    paymentAmount,
    dueBefore
  );

  if (
    !ctx.recomputeLateFeeExemptAfterAllocation ||
    !paymentMayAffectLateFeeExemption(ctx.installments, ctx.paymentDate)
  ) {
    return firstPass;
  }

  const updatedExempt = ctx.recomputeLateFeeExemptAfterAllocation(
    firstPass.allocations
  );
  const hasNewExempt = ctx.installments.some(
    (inst) =>
      updatedExempt[inst.id] === true &&
      ctx.lateFeeExemptByInstallmentId?.[inst.id] !== true
  );
  if (!hasNewExempt) {
    return firstPass;
  }

  return allocateFixedInstallmentPaymentOnce(
    {
      ...ctx,
      lateFeeExemptByInstallmentId: updatedExempt,
    },
    paymentAmount,
    summarizeFixedInstallmentDue({
      ...ctx,
      lateFeeExemptByInstallmentId: updatedExempt,
    })
  );
}

export { totalPendingInterest };
