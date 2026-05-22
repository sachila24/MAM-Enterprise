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
  calculateLateFeeAmount,
  calculateMonthsLate,
} from './fixedInstallment';
import { computeLoanLateFeesV3 } from './lateFeeEngineV3';
import { getNextDueDateForFixedInstallments } from './loanNextDue';
import { roundLKR } from './money';
import {
  allocateFixedInstallmentPayment,
  allocateInterestOnlyPaymentLines,
  type InstallmentForAllocation,
} from './paymentAllocation';
import { splitAllocationsCashAndDiscount } from './paymentDiscountSplit';

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
  oneMonthLate: calculateLateFeeAmount({
    installmentAmount: 15_834,
    lateFeeRatePercent: DEFAULT_LATE_FEE_RATE_PERCENT,
    monthsLate: 1,
  }),
  twoMonthsLate: calculateLateFeeAmount({
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

const LATE_FEE_SCHEDULE_MAY15 = [
  { installmentId: 'lf-feb', installmentNumber: 1, dueDate: '2026-02-02', installmentAmount: LATE_FEE_INST, paidAmount: 0 },
  { installmentId: 'lf-mar', installmentNumber: 2, dueDate: '2026-03-02', installmentAmount: LATE_FEE_INST, paidAmount: 0 },
  { installmentId: 'lf-apr', installmentNumber: 3, dueDate: '2026-04-02', installmentAmount: LATE_FEE_INST, paidAmount: 0 },
  { installmentId: 'lf-may', installmentNumber: 4, dueDate: '2026-05-16', installmentAmount: LATE_FEE_INST, paidAmount: 0 },
];

/** A: Feb index 0, pay 2026-05-15 → 3 late months, fee 3,957 */
export const EXAMPLE_LATE_FEE_A = (() => {
  const result = computeLoanLateFeesV3({
    monthlyInstallment: LATE_FEE_INST,
    lateFeeRatePercent: LATE_FEE_RATE,
    paymentDate: LATE_FEE_AS_OF,
    installments: LATE_FEE_SCHEDULE_MAY15,
  });
  const line = result.lines.find((l) => l.installmentId === 'lf-feb');
  return {
    due: '2026-02-02',
    monthsLate: line?.lateMonths ?? 0,
    lateFee: line?.lateFee ?? 0,
    expected: { monthsLate: 3, lateFee: 3_957 },
  };
})();

/** B: Mar index 1 → 2 late months, fee 2,638 */
export const EXAMPLE_LATE_FEE_B = (() => {
  const result = computeLoanLateFeesV3({
    monthlyInstallment: LATE_FEE_INST,
    lateFeeRatePercent: LATE_FEE_RATE,
    paymentDate: LATE_FEE_AS_OF,
    installments: LATE_FEE_SCHEDULE_MAY15,
  });
  const line = result.lines.find((l) => l.installmentId === 'lf-mar');
  return {
    due: '2026-03-02',
    monthsLate: line?.lateMonths ?? 0,
    lateFee: line?.lateFee ?? 0,
    expected: { monthsLate: 2, lateFee: 2_638 },
  };
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

/** Declining model: 15,834 @ 5% → base 792; Feb–May overdue as of 2026-06-01 */
/**
 * Index model: Apr(0) + May(1) on pay 2026-05-20 → late months 2 & 1 = 1,500.
 */
export const EXAMPLE_BANK_LATE_FEE_SCHEDULE_MAY20 = (() => {
  const monthlyInstallment = 10_000;
  const paymentDate = '2026-05-20';
  const result = computeLoanLateFeesV3({
    monthlyInstallment,
    lateFeeRatePercent: 5,
    paymentDate,
    installments: [
      {
        installmentId: 'apr',
        installmentNumber: 1,
        dueDate: '2026-04-11',
        installmentAmount: monthlyInstallment,
        paidAmount: 0,
      },
      {
        installmentId: 'may',
        installmentNumber: 2,
        dueDate: '2026-05-11',
        installmentAmount: monthlyInstallment,
        paidAmount: 0,
      },
    ],
  });
  const byId = Object.fromEntries(result.lines.map((l) => [l.installmentId, l]));
  return {
    result,
    apr: byId.apr,
    may: byId.may,
    expected: { totalLateFee: 500, aprMonths: 1, mayMonths: 0 },
  };
})();

/** Date-based: Feb–May dues, pay 2026-05-20 → 3,2,1,0 late months */
export const EXAMPLE_DATE_LATE_FEE_MAY20 = (() => {
  const monthlyInstallment = 15_834;
  const paymentDate = '2026-05-20';
  const result = computeLoanLateFeesV3({
    monthlyInstallment,
    lateFeeRatePercent: 5,
    paymentDate,
    installments: [
      { installmentId: 'feb', installmentNumber: 2, dueDate: '2026-02-01', installmentAmount: monthlyInstallment, paidAmount: 0 },
      { installmentId: 'mar', installmentNumber: 3, dueDate: '2026-03-01', installmentAmount: monthlyInstallment, paidAmount: 0 },
      { installmentId: 'apr', installmentNumber: 4, dueDate: '2026-04-01', installmentAmount: monthlyInstallment, paidAmount: 0 },
      { installmentId: 'may', installmentNumber: 5, dueDate: '2026-05-01', installmentAmount: monthlyInstallment, paidAmount: 0 },
    ],
  });
  const byId = Object.fromEntries(result.lines.map((l) => [l.installmentId, l]));
  return {
    result,
    feb: byId.feb,
    mar: byId.mar,
    apr: byId.apr,
    may: byId.may,
    expected: { febMonths: 3, marMonths: 2, aprMonths: 1, mayMonths: 0 },
  };
})();

/** @deprecated Use EXAMPLE_DATE_LATE_FEE_MAY20 */
export const EXAMPLE_INDEX_LATE_FEE_MAY20 = EXAMPLE_DATE_LATE_FEE_MAY20;

/** 10k @ 5%, pay 2026-05-20: Mar(0) 2mo + Apr(1) 1mo = 1,500 late fee */
export const EXAMPLE_BANK_LATE_FEE_MAY20 = (() => {
  const monthlyInstallment = 10_000;
  const paymentDate = '2026-05-20';
  const result = computeLoanLateFeesV3({
    monthlyInstallment,
    lateFeeRatePercent: 5,
    paymentDate,
    installments: [
      {
        installmentId: 'mar',
        installmentNumber: 1,
        dueDate: '2026-03-11',
        installmentAmount: monthlyInstallment,
        paidAmount: 0,
      },
      {
        installmentId: 'apr',
        installmentNumber: 2,
        dueDate: '2026-04-11',
        installmentAmount: monthlyInstallment,
        paidAmount: 0,
      },
    ],
  });
  const byId = Object.fromEntries(result.lines.map((l) => [l.installmentId, l]));
  return {
    result,
    mar: byId.mar,
    apr: byId.apr,
    expected: {
      baseLateFee: 500,
      totalLateFee: 1_500,
      marMonths: 2,
      aprMonths: 1,
      marIndex: 0,
      aprIndex: 1,
    },
  };
})();

/** 15,000 pay clears 1,500 late fee, 10,000 oldest installment, 3,500 partial next */
export const EXAMPLE_BANK_ALLOCATION_15K = (() => {
  const installments: InstallmentForAllocation[] = [
    {
      id: 'mar',
      installmentNumber: 1,
      dueDate: '2026-03-11',
      installmentAmount: 10_000,
      paidAmount: 0,
      lateFeeAmount: 0,
      lateFeePaid: 0,
    },
    {
      id: 'apr',
      installmentNumber: 2,
      dueDate: '2026-04-11',
      installmentAmount: 10_000,
      paidAmount: 0,
      lateFeeAmount: 0,
      lateFeePaid: 0,
    },
  ];
  const allocation = allocateFixedInstallmentPayment(
    {
      installments,
      paymentDate: '2026-05-20',
      currentInstallmentNumber: 2,
      loanBalanceAmount: 20_000,
      lateFeeRatePercent: 5,
      monthlyInstallmentAmount: 10_000,
    },
    15_000
  );
  const marInst = allocation.allocations.find(
    (a) => a.installmentId === 'mar' && a.allocationType === 'INSTALLMENT'
  );
  const aprInst = allocation.allocations.find(
    (a) => a.installmentId === 'apr' && a.allocationType === 'INSTALLMENT'
  );
  return {
    allocation,
    marInstPaid: marInst?.amount ?? 0,
    aprInstPaid: aprInst?.amount ?? 0,
    expected: {
      lateFeesPaid: 1_500,
      marInstallmentPaid: 10_000,
      aprInstallmentPaid: 3_500,
      aprRemaining: 6_500,
    },
  };
})();

export const EXAMPLE_DECLINING_LATE_FEES = (() => {
  const monthlyInstallment = 15_834;
  const paymentDate = '2026-06-01';
  const result = computeLoanLateFeesV3({
    monthlyInstallment,
    lateFeeRatePercent: 5,
    paymentDate,
    installments: [
      { installmentId: 'ex-2', installmentNumber: 2, dueDate: '2026-02-01', installmentAmount: 15_834, paidAmount: 0 },
      { installmentId: 'ex-3', installmentNumber: 3, dueDate: '2026-03-01', installmentAmount: 15_834, paidAmount: 0 },
      { installmentId: 'ex-4', installmentNumber: 4, dueDate: '2026-04-01', installmentAmount: 15_834, paidAmount: 0 },
      { installmentId: 'ex-5', installmentNumber: 5, dueDate: '2026-05-01', installmentAmount: 15_834, paidAmount: 0 },
    ],
  });
  const byNum = Object.fromEntries(
    result.lines.map((i) => [i.installmentNumber, i])
  );
  return {
    baseLateFee: result.baseLateFee,
    totalLateFeeOutstanding: result.totalLateFeeOutstanding,
    feb: byNum[2],
    mar: byNum[3],
    apr: byNum[4],
    may: byNum[5],
    expected: {
      baseLateFee: 792,
      febFee: 3_168,
      marFee: 2_376,
      aprFee: 1_584,
      mayFee: 792,
      total: 7_920,
    },
  };
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

function runDiscountPaymentExample(
  installments: InstallmentForAllocation[],
  loanBalance: number,
  cash: number,
  discount: number,
  paymentDate: string,
  currentInstallmentNumber: number,
  lateFeeRatePercent = 0
) {
  const totalApply = roundLKR(cash + discount);
  const base = allocateFixedInstallmentPayment(
    {
      installments,
      paymentDate,
      currentInstallmentNumber,
      loanBalanceAmount: loanBalance,
      lateFeeRatePercent,
    },
    totalApply
  );
  const lines = splitAllocationsCashAndDiscount(
    base.allocations,
    cash,
    discount
  );
  const totalAllocated = roundLKR(
    lines.reduce((s, l) => s + l.amount, 0)
  );
  const advance = base.summary.advanceAmount ?? 0;
  const appliedToBalance = roundLKR(totalAllocated - advance);
  return {
    cash,
    discount,
    totalApply,
    totalAllocated,
    unallocated: roundLKR(totalApply - totalAllocated),
    arrearsRemainingAfter: base.summary.arrearsRemainingAfter ?? 0,
    appliedToBalance,
  };
}

/** A: due 4,320 · cash 4,000 · discount 320 */
export const EXAMPLE_DISCOUNT_FIXED_A = runDiscountPaymentExample(
  [
    {
      id: 'ex-a',
      installmentNumber: 1,
      dueDate: '2026-01-01',
      installmentAmount: 4_320,
      paidAmount: 0,
      lateFeeAmount: 0,
      lateFeePaid: 0,
    },
  ],
  4_320,
  4_000,
  320,
  '2026-01-01',
  1,
  0
);

/** B: due 32,460 · cash 32,000 · discount 460 */
export const EXAMPLE_DISCOUNT_FIXED_B = runDiscountPaymentExample(
  [
    {
      id: 'ex-b',
      installmentNumber: 1,
      dueDate: '2026-01-01',
      installmentAmount: 32_000,
      paidAmount: 0,
      lateFeeAmount: 460,
      lateFeePaid: 0,
    },
  ],
  32_460,
  32_000,
  460,
  '2026-01-01',
  1,
  0
);

/** C: interest due 5,000 · cash 4,000 · discount 1,000 */
export const EXAMPLE_DISCOUNT_INTEREST_ONLY_C = (() => {
  const cash = 4_000;
  const discount = 1_000;
  const totalApply = cash + discount;
  const base = allocateInterestOnlyPaymentLines(
    {
      currentPrincipal: 100_000,
      monthlyInterestRatePercent: 5,
      cycles: [
        {
          id: 'c-ex',
          cycleNumber: 1,
          dueDate: '2026-06-15',
          openingPrincipal: 100_000,
          interestDue: 5_000,
          interestPaid: 0,
          isCurrentCycle: true,
        },
      ],
    },
    totalApply
  );
  const lines = splitAllocationsCashAndDiscount(
    base.allocations,
    cash,
    discount
  );
  const totalAllocated = roundLKR(lines.reduce((s, l) => s + l.amount, 0));
  return {
    cash,
    discount,
    totalApply,
    totalAllocated,
    unallocated: roundLKR(totalApply - totalAllocated),
    interestPaid: base.summary.interestPaid ?? 0,
    pendingAfter: base.summary.pendingInterestRemaining ?? 0,
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
      pass: EXAMPLE_LATE_FEE_A.lateFee === 3_957,
      expected: 3_957,
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
      pass: EXAMPLE_LATE_FEE_B.lateFee === 2_638,
      expected: 2_638,
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
      name: 'Declining late fee: base unit 792',
      pass: EXAMPLE_DECLINING_LATE_FEES.baseLateFee === 792,
      expected: 792,
      actual: EXAMPLE_DECLINING_LATE_FEES.baseLateFee,
    },
    {
      name: 'Declining late fee: Feb ×4',
      pass: EXAMPLE_DECLINING_LATE_FEES.feb?.lateFee === 3_168,
      expected: 3_168,
      actual: EXAMPLE_DECLINING_LATE_FEES.feb?.lateFee,
    },
    {
      name: 'Declining late fee: Feb 4 late months',
      pass: EXAMPLE_DECLINING_LATE_FEES.feb?.lateMonths === 4,
      expected: 4,
      actual: EXAMPLE_DECLINING_LATE_FEES.feb?.lateMonths,
    },
    {
      name: 'Declining late fee: May ×1',
      pass: EXAMPLE_DECLINING_LATE_FEES.may?.lateFee === 792,
      expected: 792,
      actual: EXAMPLE_DECLINING_LATE_FEES.may?.lateFee,
    },
    {
      name: 'Declining late fee: total outstanding',
      pass:
        EXAMPLE_DECLINING_LATE_FEES.totalLateFeeOutstanding === 7_920,
      expected: 7_920,
      actual: EXAMPLE_DECLINING_LATE_FEES.totalLateFeeOutstanding,
    },
    {
      name: 'Bank late fee May-20: total 1,500',
      pass: EXAMPLE_BANK_LATE_FEE_MAY20.result.totalLateFee === 1_500,
      expected: 1_500,
      actual: EXAMPLE_BANK_LATE_FEE_MAY20.result.totalLateFee,
    },
    {
      name: 'Bank late fee May-20: Mar 2 months',
      pass: EXAMPLE_BANK_LATE_FEE_MAY20.mar?.lateMonths === 2,
      expected: 2,
      actual: EXAMPLE_BANK_LATE_FEE_MAY20.mar?.lateMonths,
    },
    {
      name: 'Bank allocation 15k: late fees first',
      pass:
        EXAMPLE_BANK_ALLOCATION_15K.allocation.summary.lateFeesPaid === 1_500,
      expected: 1_500,
      actual: EXAMPLE_BANK_ALLOCATION_15K.allocation.summary.lateFeesPaid,
    },
    {
      name: 'Bank allocation 15k: Mar installment full',
      pass: EXAMPLE_BANK_ALLOCATION_15K.marInstPaid === 10_000,
      expected: 10_000,
      actual: EXAMPLE_BANK_ALLOCATION_15K.marInstPaid,
    },
    {
      name: 'Bank allocation 15k: Apr partial 3,500',
      pass: EXAMPLE_BANK_ALLOCATION_15K.aprInstPaid === 3_500,
      expected: 3_500,
      actual: EXAMPLE_BANK_ALLOCATION_15K.aprInstPaid,
    },
    {
      name: 'Bank late fee: same due day zero',
      pass:
        calculateMonthsLate('2026-04-11', '2026-04-11') === 0,
      expected: 0,
      actual: calculateMonthsLate('2026-04-11', '2026-04-11'),
    },
    {
      name: 'Date May-20: Feb → 3 late months',
      pass: EXAMPLE_DATE_LATE_FEE_MAY20.feb?.lateMonths === 3,
      expected: 3,
      actual: EXAMPLE_DATE_LATE_FEE_MAY20.feb?.lateMonths,
    },
    {
      name: 'Date May-20: Mar → 2 late months',
      pass: EXAMPLE_DATE_LATE_FEE_MAY20.mar?.lateMonths === 2,
      expected: 2,
      actual: EXAMPLE_DATE_LATE_FEE_MAY20.mar?.lateMonths,
    },
    {
      name: 'Date May-20: Apr → 1 late month',
      pass: EXAMPLE_DATE_LATE_FEE_MAY20.apr?.lateMonths === 1,
      expected: 1,
      actual: EXAMPLE_DATE_LATE_FEE_MAY20.apr?.lateMonths,
    },
    {
      name: 'Date May-20: May → 0 late months',
      pass: EXAMPLE_DATE_LATE_FEE_MAY20.may?.lateMonths === 0,
      expected: 0,
      actual: EXAMPLE_DATE_LATE_FEE_MAY20.may?.lateMonths,
    },
    {
      name: 'Bank schedule Apr+May: 500 on May-20 (date 1 & 0)',
      pass:
        EXAMPLE_BANK_LATE_FEE_SCHEDULE_MAY20.result.totalLateFee === 500,
      expected: 500,
      actual: EXAMPLE_BANK_LATE_FEE_SCHEDULE_MAY20.result.totalLateFee,
    },
    {
      name: 'Bank schedule: May → 0 late months',
      pass: EXAMPLE_BANK_LATE_FEE_SCHEDULE_MAY20.may?.lateMonths === 0,
      expected: 0,
      actual: EXAMPLE_BANK_LATE_FEE_SCHEDULE_MAY20.may?.lateMonths,
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
    {
      name: 'Discount fixed A: total applied 4,320',
      pass:
        EXAMPLE_DISCOUNT_FIXED_A.totalApply === 4_320 &&
        EXAMPLE_DISCOUNT_FIXED_A.unallocated === 0 &&
        EXAMPLE_DISCOUNT_FIXED_A.arrearsRemainingAfter === 0,
      expected: { totalApply: 4_320, unallocated: 0, arrears: 0 },
      actual: EXAMPLE_DISCOUNT_FIXED_A,
    },
    {
      name: 'Discount fixed A: cash 4,000 only',
      pass: EXAMPLE_DISCOUNT_FIXED_A.cash === 4_000,
      expected: 4_000,
      actual: EXAMPLE_DISCOUNT_FIXED_A.cash,
    },
    {
      name: 'Discount fixed B: total applied 32,460',
      pass:
        EXAMPLE_DISCOUNT_FIXED_B.totalApply === 32_460 &&
        EXAMPLE_DISCOUNT_FIXED_B.unallocated === 0 &&
        EXAMPLE_DISCOUNT_FIXED_B.arrearsRemainingAfter === 0,
      expected: { totalApply: 32_460, unallocated: 0, arrears: 0 },
      actual: EXAMPLE_DISCOUNT_FIXED_B,
    },
    {
      name: 'Discount interest-only C: interest cleared',
      pass:
        EXAMPLE_DISCOUNT_INTEREST_ONLY_C.totalApply === 5_000 &&
        EXAMPLE_DISCOUNT_INTEREST_ONLY_C.unallocated === 0 &&
        EXAMPLE_DISCOUNT_INTEREST_ONLY_C.interestPaid === 5_000,
      expected: { totalApply: 5_000, interestPaid: 5_000 },
      actual: EXAMPLE_DISCOUNT_INTEREST_ONLY_C,
    },
  ];
}

export function allFinanceExamplesPass(): boolean {
  return verifyFinanceExamples().every((c) => c.pass);
}
