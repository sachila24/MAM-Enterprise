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
  ];
}

export function allFinanceExamplesPass(): boolean {
  return verifyFinanceExamples().every((c) => c.pass);
}
