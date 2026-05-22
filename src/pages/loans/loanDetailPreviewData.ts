/**
 * Typed preview data for Loan Detail (no Supabase, not mockData.ts).
 */

import type { Customer, Guarantee, Bike } from '../../types/entities';
import type {
  Loan,
  LoanInstallment,
  LoanInterestCycle,
} from '../../types/loan';
import { computeDueDateForCycle } from '../../lib/finance/dueDates';
import {
  calculateFixedInstallmentTotals,
  buildFixedInstallmentSchedule,
} from '../../lib/finance/fixedInstallment';
import { isDateBefore } from '../../lib/time/systemTime';
import { totalPendingInterest } from '../../lib/finance/interestOnly';
import type { InterestCycleForAllocation } from '../../lib/finance/interestOnly';
import {
  INTEREST_ONLY_PREVIEW_BUNDLE,
  FIXED_INSTALLMENT_PREVIEW_BUNDLE,
} from '../payments/paymentPreviewData';

export interface PrincipalPaymentRecord {
  paymentCode: string;
  paymentDate: string;
  amount: number;
  principalReduction: number;
  principalAfter: number;
}

export interface LoanLedgerPayment {
  paymentDate: string;
  amount: number;
  reference?: string;
}

export interface LoanDetailData {
  loan: Loan;
  customer: Customer;
  bike?: Bike;
  interestCycles: LoanInterestCycle[];
  installments: LoanInstallment[];
  guarantees: Guarantee[];
  principalPayments: PrincipalPaymentRecord[];
  ledgerPayments: LoanLedgerPayment[];
  monthsCompleted: number;
}

const ts = '2026-05-15T00:00:00Z';

function cycleFromPreview(
  loanId: string,
  loanStartDate: string,
  c: InterestCycleForAllocation,
  rate: number
): LoanInterestCycle {
  const opening = c.openingPrincipal;
  const closing = opening - (c.principalPaid ?? 0);
  let status: LoanInterestCycle['status'] = 'PENDING';
  if (c.interestPaid >= c.interestDue && (c.principalPaid ?? 0) > 0) status = 'PAID';
  else if (c.interestPaid > 0 || (c.principalPaid ?? 0) > 0) status = 'PARTIAL';

  const periodStart =
    c.cycleNumber === 1
      ? loanStartDate
      : computeDueDateForCycle(loanStartDate, c.cycleNumber - 1);

  return {
    id: c.id,
    loanId,
    cycleNumber: c.cycleNumber,
    periodStart,
    periodEnd: c.dueDate,
    dueDate: c.dueDate,
    openingPrincipal: opening,
    interestRate: rate,
    interestDue: c.interestDue,
    interestPaid: c.interestPaid,
    principalPaid: c.principalPaid ?? 0,
    closingPrincipal: closing,
    status,
    createdAt: ts,
    updatedAt: ts,
  };
}

function buildInterestOnlyDetail(): LoanDetailData {
  const bundle = INTEREST_ONLY_PREVIEW_BUNDLE;
  const loan = bundle.loans[0];
  const customer = bundle.customers[0];
  const previewCycles = bundle.interestCyclesByLoanId[loan.id] ?? [];

  const cycles = previewCycles.map((c) =>
    cycleFromPreview(loan.id, loan.startDate, c, loan.interestRate)
  );

  const pending = totalPendingInterest(previewCycles);

  return {
    loan: {
      ...loan,
      pendingInterestAmount: pending,
    },
    customer,
    bike: undefined,
    interestCycles: cycles,
    installments: [],
    guarantees: [
      {
        id: 'g-io-1',
        guaranteeCode: 'GUA-PRE-1',
        loanId: loan.id,
        type: 'VEHICLE_BOOK',
        description: 'Vehicle book — ABC-1234',
        storageLocation: 'Office safe',
        status: 'held',
        receivedAt: '2026-05-15',
      },
    ],
    principalPayments: [],
    ledgerPayments: [],
    monthsCompleted: 0,
  };
}

/** Interest-only with one completed payment (55k example) */
export function buildInterestOnlyPaidDetail(): LoanDetailData {
  const base = buildInterestOnlyDetail();
  const loan = {
    ...base.loan,
    currentPrincipalBalance: 50_000,
    balanceAmount: 50_000,
    paidAmount: 55_000,
    pendingInterestAmount: 0,
  };
  const cycles: LoanInterestCycle[] = [
    {
      id: 'cycle-1-done',
      loanId: loan.id,
      cycleNumber: 1,
      periodStart: '2026-05-15',
      periodEnd: '2026-06-14',
      dueDate: '2026-06-15',
      openingPrincipal: 100_000,
      interestRate: 5,
      interestDue: 5_000,
      interestPaid: 5_000,
      principalPaid: 50_000,
      closingPrincipal: 50_000,
      status: 'PAID',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'cycle-2-current',
      loanId: loan.id,
      cycleNumber: 2,
      periodStart: '2026-06-15',
      periodEnd: '2026-07-14',
      dueDate: '2026-07-15',
      openingPrincipal: 50_000,
      interestRate: 5,
      interestDue: 2_500,
      interestPaid: 0,
      principalPaid: 0,
      closingPrincipal: 50_000,
      status: 'PENDING',
      createdAt: ts,
      updatedAt: ts,
    },
  ];
  return {
    ...base,
    loan,
    interestCycles: cycles,
    principalPayments: [
      {
        paymentCode: 'PAY-IO-001',
        paymentDate: '2026-06-20',
        amount: 55_000,
        principalReduction: 50_000,
        principalAfter: 50_000,
      },
    ],
    ledgerPayments: [
      {
        paymentDate: '2026-06-20',
        amount: 55_000,
        reference: 'PAY-IO-001',
      },
    ],
    monthsCompleted: 1,
  };
}

function buildFixedDetail(): LoanDetailData {
  const bundle = FIXED_INSTALLMENT_PREVIEW_BUNDLE;
  const loan = bundle.loans[0];
  const customer = bundle.customers[0];
  const totals = calculateFixedInstallmentTotals({
    financeAmount: loan.principalAmount,
    termMonths: loan.termMonths ?? 36,
    monthlyFlatRatePercent: loan.interestRate,
  });
  const schedule = buildFixedInstallmentSchedule(totals, loan.firstDueDate);
  const asOf = '2026-04-15';

  const installments: LoanInstallment[] = schedule.map((line, i) => {
    const previewInst = bundle.installmentsByLoanId[loan.id]?.find(
      (p) => p.installmentNumber === line.installmentNumber
    );
    const paidAmount = previewInst?.paidAmount ?? 0;
    const dueDate = line.dueDate;
    const isOverdue =
      isDateBefore(dueDate, asOf) && paidAmount < line.installmentAmount;
    let status: LoanInstallment['status'] = 'PENDING';
    if (paidAmount >= line.installmentAmount) status = 'PAID';
    else if (paidAmount > 0) status = 'PARTIAL';
    else if (isOverdue) status = 'OVERDUE';

    return {
      id: previewInst?.id ?? `inst-${i + 1}`,
      loanId: loan.id,
      installmentNumber: line.installmentNumber,
      dueDate: line.dueDate,
      principalComponent: line.principalComponent,
      interestComponent: line.interestComponent,
      installmentAmount: line.installmentAmount,
      paidAmount,
      lateFeeAmount: 0,
      lateFeePaid: 0,
      status,
      createdAt: ts,
      updatedAt: ts,
    };
  });

  return {
    loan,
    customer,
    bike: undefined,
    interestCycles: [],
    installments,
    guarantees: [],
    principalPayments: [],
    ledgerPayments: [],
    monthsCompleted: 4,
  };
}

const DETAIL_BY_LOAN_ID: Record<string, LoanDetailData> = {
  'preview-loan-io': buildInterestOnlyDetail(),
  'preview-loan-io-paid': buildInterestOnlyPaidDetail(),
  'preview-loan-fix': buildFixedDetail(),
};

export const LOAN_DETAIL_PREVIEW_LINKS = [
  { id: 'preview-loan-io', label: 'Interest-only · LN-IO-100K' },
  { id: 'preview-loan-io-paid', label: 'Interest-only · after LKR 55k payment' },
  { id: 'preview-loan-fix', label: 'Fixed installment · LN-FIX-300K' },
];

export function resolveLoanDetailPreview(
  loanId: string | undefined
): LoanDetailData | null {
  if (!loanId) return null;
  return DETAIL_BY_LOAN_ID[loanId] ?? null;
}

/** @deprecated Use getLoanDetailFromDb + resolveLoanDetailPreview */
export function resolveLoanDetail(loanId: string | undefined): LoanDetailData | null {
  return resolveLoanDetailPreview(loanId);
}
