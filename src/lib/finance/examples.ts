/**
 * Documented finance examples — run `verifyFinanceExamples()` in dev to assert.
 */

import { DEFAULT_LATE_FEE_RATE_PERCENT } from './constants';
import { computeFirstDueDate, addMonthsSameDay } from './dueDates';
import { calculateEarlySettlementQuote, canRequestEarlySettlement } from './earlySettlement';
import {
  allocateInterestOnlyPayment,
  calculateNextCycleInterestDue,
  totalPendingInterest,
  type InterestCycleForAllocation,
} from './interestOnly';
import {
  buildDueInterestCyclesForAllocation,
  summarizeInterestOnlyLoan,
} from './interestOnlyCycles';
import {
  calculateFixedInstallmentTotals,
  calculateLateFee,
} from './fixedInstallment';

export const EXAMPLE_1_INTEREST_ONLY = (() => {
  const allocation = allocateInterestOnlyPayment(100_000, 5, 55_000);
  const nextInterest = calculateNextCycleInterestDue(
    allocation.newPrincipal,
    5
  );
  return {
    allocation,
    nextInterest,
    expected: {
      interestPaid: 5_000,
      principalPaid: 50_000,
      newPrincipal: 50_000,
      nextInterest: 2_500,
    },
  };
})();

export const EXAMPLE_1B_PENDING_INTEREST = (() => {
  const cycles: InterestCycleForAllocation[] = [
    {
      id: 'c1',
      cycleNumber: 1,
      dueDate: '2026-06-15',
      openingPrincipal: 100_000,
      interestDue: 5_000,
      interestPaid: 0,
    },
    {
      id: 'c2',
      cycleNumber: 2,
      dueDate: '2026-07-15',
      openingPrincipal: 100_000,
      interestDue: 5_000,
      interestPaid: 0,
      isCurrentCycle: true,
    },
  ];
  const pendingBefore = totalPendingInterest(cycles);
  const allocation = allocateInterestOnlyPayment(100_000, 5, 7_000, cycles);
  return {
    pendingBefore,
    allocation,
    expected: { pendingBefore: 10_000, interestPaid: 7_000, principalPaid: 0 },
  };
})();

export const EXAMPLE_2_DUE_DATES = {
  start: '2026-05-15',
  firstDue: computeFirstDueDate('2026-05-15'),
  secondDue: addMonthsSameDay('2026-05-15', 2),
  expected: {
    firstDue: '2026-06-15',
    secondDue: '2026-07-15',
  },
};

export const EXAMPLE_3_FIXED_INSTALLMENT = calculateFixedInstallmentTotals({
  financeAmount: 300_000,
  termMonths: 36,
  monthlyFlatRatePercent: 2.5,
});

export const EXAMPLE_4_ARREARS = {
  installmentAmount: 15_834,
  lateFeeRatePercent: DEFAULT_LATE_FEE_RATE_PERCENT,
  oneMonthLate: calculateLateFee({
    installmentAmount: 15_834,
    lateFeeRatePercent: DEFAULT_LATE_FEE_RATE_PERCENT,
    monthsLate: 1,
  }),
  twoMonthsLate: calculateLateFee({
    installmentAmount: 15_834,
    lateFeeRatePercent: DEFAULT_LATE_FEE_RATE_PERCENT,
    monthsLate: 2,
  }),
};

/** Start 2026-02-01, as-of 2026-05-15, 200k @ 5% → 3 cycles, 30k pending, next due Jun 1 */
export const EXAMPLE_IO_A_MULTI_CYCLE = (() => {
  const start = '2026-02-01';
  const asOf = '2026-05-15';
  const principal = 200_000;
  const rate = 5;
  const cycles = buildDueInterestCyclesForAllocation(
    start,
    rate,
    principal,
    asOf
  );
  const summary = summarizeInterestOnlyLoan(
    start,
    rate,
    principal,
    cycles,
    asOf
  );
  return {
    cycles,
    summary,
    expected: {
      cycleCount: 3,
      pendingInterest: 30_000,
      nextDue: '2026-06-01',
    },
  };
})();

/** Same loan, payment 35,000 */
export const EXAMPLE_IO_B_PAY_35K = (() => {
  const { cycles } = EXAMPLE_IO_A_MULTI_CYCLE;
  const allocation = allocateInterestOnlyPayment(200_000, 5, 35_000, cycles);
  const nextInterest = calculateNextCycleInterestDue(
    allocation.newPrincipal,
    5
  );
  return {
    allocation,
    nextInterest,
    expected: {
      interestPaid: 30_000,
      principalPaid: 5_000,
      newPrincipal: 195_000,
      nextInterest: 9_750,
    },
  };
})();

/** Same loan, payment 12,000 */
export const EXAMPLE_IO_C_PAY_12K = (() => {
  const { cycles } = EXAMPLE_IO_A_MULTI_CYCLE;
  const allocation = allocateInterestOnlyPayment(200_000, 5, 12_000, cycles);
  return {
    allocation,
    expected: {
      interestPaid: 12_000,
      principalPaid: 0,
      newPrincipal: 200_000,
      pendingInterestRemaining: 18_000,
    },
  };
})();

export const EXAMPLE_5_EARLY_SETTLEMENT = {
  beforeMinimum: canRequestEarlySettlement(5, 6),
  afterMinimum: canRequestEarlySettlement(7, 6),
  quote: calculateEarlySettlementQuote({
    monthsCompleted: 7,
    minimumMonthsBeforeSettlement: 6,
    remainingPrincipal: 200_000,
    remainingInterest: 80_000,
    discountPercentage: 10,
    currentMonthDue: 15_834,
    includeCurrentMonthDue: true,
  }),
};

export interface ExampleCheck {
  name: string;
  pass: boolean;
  expected: unknown;
  actual: unknown;
}

export function verifyFinanceExamples(): ExampleCheck[] {
  const e1 = EXAMPLE_1_INTEREST_ONLY;
  const e1b = EXAMPLE_1B_PENDING_INTEREST;
  return [
    {
      name: 'Interest-only: interest paid',
      pass: e1.allocation.interestPaid === 5_000,
      expected: 5_000,
      actual: e1.allocation.interestPaid,
    },
    {
      name: 'Interest-only: principal paid',
      pass: e1.allocation.principalPaid === 50_000,
      expected: 50_000,
      actual: e1.allocation.principalPaid,
    },
    {
      name: 'Interest-only: new principal',
      pass: e1.allocation.newPrincipal === 50_000,
      expected: 50_000,
      actual: e1.allocation.newPrincipal,
    },
    {
      name: 'Interest-only: next cycle interest',
      pass: e1.nextInterest === 2_500,
      expected: 2_500,
      actual: e1.nextInterest,
    },
    {
      name: 'Pending interest: total before',
      pass: e1b.pendingBefore === 10_000,
      expected: 10_000,
      actual: e1b.pendingBefore,
    },
    {
      name: 'Pending interest: partial pay',
      pass:
        e1b.allocation.interestPaid === 7_000 &&
        e1b.allocation.principalPaid === 0,
      expected: { interestPaid: 7_000, principalPaid: 0 },
      actual: {
        interestPaid: e1b.allocation.interestPaid,
        principalPaid: e1b.allocation.principalPaid,
      },
    },
    {
      name: 'Due dates: first due',
      pass: EXAMPLE_2_DUE_DATES.firstDue === '2026-06-15',
      expected: '2026-06-15',
      actual: EXAMPLE_2_DUE_DATES.firstDue,
    },
    {
      name: 'Due dates: second due',
      pass: EXAMPLE_2_DUE_DATES.secondDue === '2026-07-15',
      expected: '2026-07-15',
      actual: EXAMPLE_2_DUE_DATES.secondDue,
    },
    {
      name: 'Fixed: total interest',
      pass: EXAMPLE_3_FIXED_INSTALLMENT.totalInterest === 270_000,
      expected: 270_000,
      actual: EXAMPLE_3_FIXED_INSTALLMENT.totalInterest,
    },
    {
      name: 'Fixed: monthly installment',
      pass: EXAMPLE_3_FIXED_INSTALLMENT.monthlyInstallment === 15_834,
      expected: 15_834,
      actual: EXAMPLE_3_FIXED_INSTALLMENT.monthlyInstallment,
    },
    {
      name: 'Arrears: 1 month late fee',
      pass: EXAMPLE_4_ARREARS.oneMonthLate === 792,
      expected: 792,
      actual: EXAMPLE_4_ARREARS.oneMonthLate,
    },
    {
      name: 'Arrears: 2 months late fee',
      pass: EXAMPLE_4_ARREARS.twoMonthsLate === 1_584,
      expected: 1_584,
      actual: EXAMPLE_4_ARREARS.twoMonthsLate,
    },
    {
      name: 'Settlement: blocked before month 6',
      pass: EXAMPLE_5_EARLY_SETTLEMENT.beforeMinimum === false,
      expected: false,
      actual: EXAMPLE_5_EARLY_SETTLEMENT.beforeMinimum,
    },
    {
      name: 'Settlement: final amount',
      pass:
        EXAMPLE_5_EARLY_SETTLEMENT.quote.finalSettlementAmount === 287_834,
      expected: 287_834,
      actual: EXAMPLE_5_EARLY_SETTLEMENT.quote.finalSettlementAmount,
    },
    {
      name: 'IO multi-cycle: count',
      pass: EXAMPLE_IO_A_MULTI_CYCLE.cycles.length === 3,
      expected: 3,
      actual: EXAMPLE_IO_A_MULTI_CYCLE.cycles.length,
    },
    {
      name: 'IO multi-cycle: pending interest',
      pass: EXAMPLE_IO_A_MULTI_CYCLE.summary.pendingInterest === 30_000,
      expected: 30_000,
      actual: EXAMPLE_IO_A_MULTI_CYCLE.summary.pendingInterest,
    },
    {
      name: 'IO multi-cycle: next due',
      pass: EXAMPLE_IO_A_MULTI_CYCLE.summary.nextDueDate === '2026-06-01',
      expected: '2026-06-01',
      actual: EXAMPLE_IO_A_MULTI_CYCLE.summary.nextDueDate,
    },
    {
      name: 'IO pay 35k: interest',
      pass: EXAMPLE_IO_B_PAY_35K.allocation.interestPaid === 30_000,
      expected: 30_000,
      actual: EXAMPLE_IO_B_PAY_35K.allocation.interestPaid,
    },
    {
      name: 'IO pay 35k: principal',
      pass: EXAMPLE_IO_B_PAY_35K.allocation.principalPaid === 5_000,
      expected: 5_000,
      actual: EXAMPLE_IO_B_PAY_35K.allocation.principalPaid,
    },
    {
      name: 'IO pay 35k: next interest',
      pass: EXAMPLE_IO_B_PAY_35K.nextInterest === 9_750,
      expected: 9_750,
      actual: EXAMPLE_IO_B_PAY_35K.nextInterest,
    },
    {
      name: 'IO pay 12k: pending remaining',
      pass:
        EXAMPLE_IO_C_PAY_12K.allocation.pendingInterestRemaining === 18_000,
      expected: 18_000,
      actual: EXAMPLE_IO_C_PAY_12K.allocation.pendingInterestRemaining,
    },
    {
      name: 'IO pay 12k: no principal',
      pass: EXAMPLE_IO_C_PAY_12K.allocation.principalPaid === 0,
      expected: 0,
      actual: EXAMPLE_IO_C_PAY_12K.allocation.principalPaid,
    },
  ];
}

export function allFinanceExamplesPass(): boolean {
  return verifyFinanceExamples().every((c) => c.pass);
}
