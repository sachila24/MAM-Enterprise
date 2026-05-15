import { roundLKR } from './money';

export interface InterestCycleForAllocation {
  id: string;
  cycleNumber: number;
  dueDate: string;
  openingPrincipal: number;
  interestDue: number;
  interestPaid: number;
  isCurrentCycle?: boolean;
}

export interface InterestOnlyCycleInput {
  openingPrincipal: number;
  monthlyInterestRatePercent: number;
}

export interface InterestOnlyCycleAmounts {
  interestDue: number;
}

export interface InterestOnlyPaymentAllocation {
  paymentAmount: number;
  /** Total interest outstanding before payment (pending + current). */
  totalInterestDue: number;
  interestPaid: number;
  principalPaid: number;
  newPrincipal: number;
  pendingInterestRemaining: number;
  unallocated: number;
  /** Per-cycle interest applied, oldest first. */
  cycleAllocations: Array<{
    cycleId: string;
    cycleNumber: number;
    amount: number;
  }>;
}

/** Outstanding interest on one cycle (pending if unpaid). */
export function interestOutstandingOnCycle(
  cycle: Pick<InterestCycleForAllocation, 'interestDue' | 'interestPaid'>
): number {
  return roundLKR(Math.max(0, cycle.interestDue - cycle.interestPaid));
}

/** Sum of unpaid interest across all open cycles. */
export function totalPendingInterest(
  cycles: InterestCycleForAllocation[]
): number {
  return roundLKR(
    cycles.reduce((sum, c) => sum + interestOutstandingOnCycle(c), 0)
  );
}

/** Monthly interest on current remaining principal. */
export function calculateMonthlyInterestDue(
  principal: number,
  monthlyInterestRatePercent: number
): number {
  return roundLKR(principal * (monthlyInterestRatePercent / 100));
}

export function calculateInterestOnlyCycleAmounts(
  input: InterestOnlyCycleInput
): InterestOnlyCycleAmounts {
  return {
    interestDue: calculateMonthlyInterestDue(
      input.openingPrincipal,
      input.monthlyInterestRatePercent
    ),
  };
}

/**
 * Allocate payment for interest-only loan:
 * 1. Pending/current interest (oldest cycle first)
 * 2. Principal reduction
 * No late fees. Unpaid interest stays pending on its cycle.
 */
export function allocateInterestOnlyPayment(
  currentPrincipal: number,
  monthlyInterestRatePercent: number,
  paymentAmount: number,
  cycles: InterestCycleForAllocation[] = []
): InterestOnlyPaymentAllocation {
  let remaining = paymentAmount;
  const cycleAllocations: InterestOnlyPaymentAllocation['cycleAllocations'] =
    [];
  let interestPaid = 0;

  const sortedCycles = [...cycles].sort(
    (a, b) => a.cycleNumber - b.cycleNumber
  );

  if (sortedCycles.length > 0) {
    for (const cycle of sortedCycles) {
      const owed = interestOutstandingOnCycle(cycle);
      if (owed <= 0 || remaining <= 0) continue;
      const pay = roundLKR(Math.min(remaining, owed));
      cycleAllocations.push({
        cycleId: cycle.id,
        cycleNumber: cycle.cycleNumber,
        amount: pay,
      });
      interestPaid = roundLKR(interestPaid + pay);
      remaining = roundLKR(remaining - pay);
    }
  } else {
    const singleDue = calculateMonthlyInterestDue(
      currentPrincipal,
      monthlyInterestRatePercent
    );
    const pay = roundLKR(Math.min(remaining, singleDue));
    interestPaid = pay;
    remaining = roundLKR(remaining - pay);
  }

  const principalPaid = roundLKR(Math.min(remaining, currentPrincipal));
  const newPrincipal = roundLKR(currentPrincipal - principalPaid);
  remaining = roundLKR(remaining - principalPaid);

  const pendingInterestRemaining =
    sortedCycles.length > 0
      ? roundLKR(
          totalPendingInterest(
            sortedCycles.map((c) => {
              const paidOnCycle = cycleAllocations
                .filter((a) => a.cycleId === c.id)
                .reduce((s, a) => s + a.amount, 0);
              return {
                ...c,
                interestPaid: roundLKR(c.interestPaid + paidOnCycle),
              };
            })
          )
        )
      : 0;

  const totalInterestDue =
    sortedCycles.length > 0
      ? roundLKR(totalPendingInterest(sortedCycles))
      : calculateMonthlyInterestDue(currentPrincipal, monthlyInterestRatePercent);

  return {
    paymentAmount,
    totalInterestDue,
    interestPaid,
    principalPaid,
    newPrincipal,
    pendingInterestRemaining,
    unallocated: remaining,
    cycleAllocations,
  };
}

/** Next cycle interest after principal reduction. */
export function calculateNextCycleInterestDue(
  newPrincipal: number,
  monthlyInterestRatePercent: number
): number {
  return calculateMonthlyInterestDue(newPrincipal, monthlyInterestRatePercent);
}
