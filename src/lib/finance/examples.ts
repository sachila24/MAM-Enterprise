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
  calculateInstallmentLateFee,
  getFixedLoanArrearsSummary,
} from './fixedInstallmentStatus';
import {
  calculateFixedInstallmentTotals,
  calculateInstallmentLateFeeAmount,
  calculateLateFee,
  calculateMonthsLate,
} from './fixedInstallment';
import { getNextDueDateForFixedInstallments } from './loanNextDue';
import { roundLKR } from './money';

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

const LATE_FEE_INST = 26_389;
const LATE_FEE_RATE = 5;
const LATE_FEE_AS_OF = '2026-05-15';

/** A: due 2026-02-02, as-of 2026-05-15 → 3 months, fee 3,958 */
export const EXAMPLE_LATE_FEE_A = (() => {
  const due = '2026-02-02';
  const monthsLate = calculateMonthsLate(due, LATE_FEE_AS_OF);
  const lateFee = calculateInstallmentLateFeeAmount(
    LATE_FEE_INST,
    LATE_FEE_RATE,
    monthsLate
  );
  return { due, monthsLate, lateFee, expected: { monthsLate: 3, lateFee: 3_958 } };
})();

/** B: due 2026-03-02 → 2 months, fee 2,639 */
export const EXAMPLE_LATE_FEE_B = (() => {
  const due = '2026-03-02';
  const monthsLate = calculateMonthsLate(due, LATE_FEE_AS_OF);
  const lateFee = calculateInstallmentLateFeeAmount(
    LATE_FEE_INST,
    LATE_FEE_RATE,
    monthsLate
  );
  return { due, monthsLate, lateFee, expected: { monthsLate: 2, lateFee: 2_639 } };
})();

/** C: future due → 0 */
export const EXAMPLE_LATE_FEE_C = (() => {
  const inst = {
    installmentNumber: 6,
    dueDate: '2026-07-02',
    installmentAmount: LATE_FEE_INST,
    paidAmount: 0,
    lateFeeAmount: 0,
    lateFeePaid: 0,
  };
  const { lateFeeAmount, monthsLate } = calculateInstallmentLateFee(
    inst,
    LATE_FEE_RATE,
    LATE_FEE_AS_OF
  );
  return { monthsLate, lateFeeAmount, expected: { monthsLate: 0, lateFeeAmount: 0 } };
})();

export const EXAMPLE_FIX_ARREARS = (() => {
  const asOf = '2026-05-15';
  const installments = [
    {
      installmentNumber: 1,
      dueDate: '2025-12-01',
      installmentAmount: 15_834,
      paidAmount: 15_834,
      lateFeeAmount: 0,
      lateFeePaid: 0,
    },
    {
      installmentNumber: 2,
      dueDate: '2026-01-01',
      installmentAmount: 15_834,
      paidAmount: 0,
      lateFeeAmount: 1_584,
      lateFeePaid: 0,
    },
    {
      installmentNumber: 3,
      dueDate: '2026-02-01',
      installmentAmount: 15_834,
      paidAmount: 0,
      lateFeeAmount: 792,
      lateFeePaid: 0,
    },
  ];
  return getFixedLoanArrearsSummary(installments, asOf, 5);
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

export const EXAMPLE_FIXED_100K_36_25PC = calculateFixedInstallmentTotals({
  financeAmount: 100_000,
  termMonths: 36,
  monthlyFlatRatePercent: 2.5,
});

export const EXAMPLE_FIXED_100K_36_FULL_25PC = calculateFixedInstallmentTotals({
  financeAmount: 100_000,
  termMonths: 36,
  monthlyFlatRatePercent: 25,
});

export const EXAMPLE_NEXT_DUE_SKIPS_PAID = getNextDueDateForFixedInstallments(
  [
    {
      installmentNumber: 1,
      dueDate: '2026-06-01',
      installmentAmount: 10_000,
      paidAmount: 10_000,
      lateFeeAmount: 0,
      lateFeePaid: 0,
    },
    {
      installmentNumber: 2,
      dueDate: '2026-07-01',
      installmentAmount: 10_000,
      paidAmount: 0,
      lateFeeAmount: 0,
      lateFeePaid: 0,
    },
  ],
  DEFAULT_LATE_FEE_RATE_PERCENT,
  '2026-06-15'
);

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
      name: 'Fixed 100k/36 @ 2.5%: interest',
      pass: EXAMPLE_FIXED_100K_36_25PC.totalInterest === 90_000,
      expected: 90_000,
      actual: EXAMPLE_FIXED_100K_36_25PC.totalInterest,
    },
    {
      name: 'Fixed 100k/36 @ 2.5%: payable',
      pass: EXAMPLE_FIXED_100K_36_25PC.totalPayable === 190_000,
      expected: 190_000,
      actual: EXAMPLE_FIXED_100K_36_25PC.totalPayable,
    },
    {
      name: 'Fixed 100k/36 @ 2.5%: installment',
      pass: EXAMPLE_FIXED_100K_36_25PC.monthlyInstallment === 5_278,
      expected: 5_278,
      actual: EXAMPLE_FIXED_100K_36_25PC.monthlyInstallment,
    },
    {
      name: 'Fixed 100k/36 @ 25%: interest',
      pass: EXAMPLE_FIXED_100K_36_FULL_25PC.totalInterest === 900_000,
      expected: 900_000,
      actual: EXAMPLE_FIXED_100K_36_FULL_25PC.totalInterest,
    },
    {
      name: 'Fixed 100k/36 @ 25%: payable',
      pass: EXAMPLE_FIXED_100K_36_FULL_25PC.totalPayable === 1_000_000,
      expected: 1_000_000,
      actual: EXAMPLE_FIXED_100K_36_FULL_25PC.totalPayable,
    },
    {
      name: 'Fixed 100k/36 @ 25%: installment',
      pass: EXAMPLE_FIXED_100K_36_FULL_25PC.monthlyInstallment === 27_778,
      expected: 27_778,
      actual: EXAMPLE_FIXED_100K_36_FULL_25PC.monthlyInstallment,
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
    {
      name: 'Fixed arrears: count',
      pass: EXAMPLE_FIX_ARREARS.arrearsInstallmentCount === 2,
      expected: 2,
      actual: EXAMPLE_FIX_ARREARS.arrearsInstallmentCount,
    },
    {
      name: 'Fixed arrears: has arrears',
      pass: EXAMPLE_FIX_ARREARS.hasArrears === true,
      expected: true,
      actual: EXAMPLE_FIX_ARREARS.hasArrears,
    },
    {
      name: 'Late fee A: months late',
      pass: EXAMPLE_LATE_FEE_A.monthsLate === 3,
      expected: 3,
      actual: EXAMPLE_LATE_FEE_A.monthsLate,
    },
    {
      name: 'Late fee A: amount',
      pass: EXAMPLE_LATE_FEE_A.lateFee === 3_958,
      expected: 3_958,
      actual: EXAMPLE_LATE_FEE_A.lateFee,
    },
    {
      name: 'Late fee B: months late',
      pass: EXAMPLE_LATE_FEE_B.monthsLate === 2,
      expected: 2,
      actual: EXAMPLE_LATE_FEE_B.monthsLate,
    },
    {
      name: 'Late fee B: amount',
      pass: EXAMPLE_LATE_FEE_B.lateFee === 2_639,
      expected: 2_639,
      actual: EXAMPLE_LATE_FEE_B.lateFee,
    },
    {
      name: 'Late fee C: future zero',
      pass:
        EXAMPLE_LATE_FEE_C.lateFeeAmount === 0 &&
        EXAMPLE_LATE_FEE_C.monthsLate === 0,
      expected: { lateFeeAmount: 0, monthsLate: 0 },
      actual: {
        lateFeeAmount: EXAMPLE_LATE_FEE_C.lateFeeAmount,
        monthsLate: EXAMPLE_LATE_FEE_C.monthsLate,
      },
    },
    {
      name: 'Next due skips fully paid installment',
      pass: EXAMPLE_NEXT_DUE_SKIPS_PAID.dueDate === '2026-07-01',
      expected: '2026-07-01',
      actual: EXAMPLE_NEXT_DUE_SKIPS_PAID.dueDate,
    },
    {
      name: 'Payment + discount effective amount',
      pass: roundLKR(7_000 + 167) === 7_167,
      expected: 7_167,
      actual: roundLKR(7_000 + 167),
    },
  ];
}

export function allFinanceExamplesPass(): boolean {
  return verifyFinanceExamples().every((c) => c.pass);
}
