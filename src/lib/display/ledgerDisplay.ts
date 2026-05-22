import type { LoanInterestCycle } from '../../types/loan';
import { roundLKR } from '../finance/money';
import {
  breakdownFromDbAllocations,
  type PaymentLedgerBreakdown,
} from './paymentLedgerBreakdown';
import type { DbPaymentAllocation } from '../local-db/types';
import {
  isDateBefore,
  isDateOnOrBefore,
  normalizeDate,
} from '../time/systemTime';

export interface LedgerPaymentRecord {
  paymentDate: string;
  amount: number;
  reference?: string;
  installmentPaid: number;
  lateFeePaid: number;
  interestPaid: number;
  principalPaid: number;
}

/** Installment snapshot for ledger (persisted DB fields — not live engine totals). */
export interface InstallmentLedgerSource {
  installmentNumber: number;
  dueDate: string;
  installmentAmount: number;
  paidAmount: number;
  /** Historical late fee charged — never reduced after payment */
  lateFeeAmount: number;
  lateFeePaid: number;
}

/** Display-only ledger row status. */
export type LedgerRowStatus = 'PAID' | 'PARTIAL' | 'OVERDUE';

export type LedgerEntryType = 'LOAN' | 'INSTALLMENT' | 'PAYMENT';

export interface LedgerDescriptionLine {
  label: string;
  amount: number;
}

export interface LedgerEntry {
  date: string;
  title: string;
  descriptionLines: LedgerDescriptionLine[];
  installmentAmount: number | null;
  lateFeeAmount: number | null;
  paymentAmount: number | null;
  entryType: LedgerEntryType;
  status: LedgerRowStatus;
  /** Loan balance after this payment (payment rows only). */
  outstandingBalance: number | null;
  sortOrder: number;
}

type LedgerDraft = Omit<LedgerEntry, 'outstandingBalance'>;

function ledgerStatusFromPaidAndDue(
  paid: number,
  due: number,
  dueDate: string,
  asOf: string
): LedgerRowStatus {
  const paidR = roundLKR(paid);
  const dueR = roundLKR(due);
  if (dueR <= 0 || paidR >= dueR) return 'PAID';
  if (paidR > 0) return 'PARTIAL';
  if (isDateBefore(dueDate, asOf)) return 'OVERDUE';
  return 'PARTIAL';
}

function installmentLedgerStatus(
  inst: InstallmentLedgerSource,
  asOf: string
): LedgerRowStatus {
  const totalDue = roundLKR(inst.installmentAmount + inst.lateFeeAmount);
  const totalPaid = roundLKR(inst.paidAmount + inst.lateFeePaid);
  return ledgerStatusFromPaidAndDue(totalPaid, totalDue, inst.dueDate, asOf);
}

function buildInstallmentDraft(
  inst: InstallmentLedgerSource,
  asOf: string,
  order: number
): LedgerDraft {
  const installment = roundLKR(inst.installmentAmount);
  const installmentPaid = roundLKR(inst.paidAmount);
  const installmentRemaining = roundLKR(
    Math.max(0, installment - installmentPaid)
  );

  const lateCharged = roundLKR(inst.lateFeeAmount);
  const latePaid = roundLKR(inst.lateFeePaid);
  const lateRemaining = roundLKR(Math.max(0, lateCharged - latePaid));

  const descriptionLines: LedgerDescriptionLine[] = [
    { label: 'Installment', amount: installment },
    { label: 'Installment paid', amount: installmentPaid },
    { label: 'Installment remaining', amount: installmentRemaining },
  ];

  if (lateCharged > 0 || latePaid > 0) {
    descriptionLines.push(
      { label: 'Late fee charged', amount: lateCharged },
      { label: 'Late fee paid', amount: latePaid },
      { label: 'Late fee remaining', amount: lateRemaining }
    );
  }

  return {
    date: inst.dueDate,
    title: `Installment #${inst.installmentNumber}`,
    descriptionLines,
    installmentAmount: installment,
    lateFeeAmount: lateCharged,
    paymentAmount: null,
    entryType: 'INSTALLMENT',
    status: installmentLedgerStatus(inst, asOf),
    sortOrder: order,
  };
}

function buildPaymentDraft(p: LedgerPaymentRecord, order: number): LedgerDraft {
  const refSuffix = p.reference ? ` (${p.reference})` : '';
  const descriptionLines: LedgerDescriptionLine[] = [];

  if (p.lateFeePaid > 0) {
    descriptionLines.push({ label: 'To late fee', amount: p.lateFeePaid });
  }
  if (p.installmentPaid > 0) {
    descriptionLines.push({ label: 'To installment', amount: p.installmentPaid });
  }
  if (p.interestPaid > 0) {
    descriptionLines.push({ label: 'To interest', amount: p.interestPaid });
  }
  if (p.principalPaid > 0) {
    descriptionLines.push({ label: 'To principal', amount: p.principalPaid });
  }
  descriptionLines.push({ label: 'Total payment', amount: p.amount });

  return {
    date: p.paymentDate,
    title: `Payment received${refSuffix}`,
    descriptionLines,
    installmentAmount: p.installmentPaid > 0 ? p.installmentPaid : null,
    lateFeeAmount: p.lateFeePaid > 0 ? p.lateFeePaid : null,
    paymentAmount: p.amount,
    entryType: 'PAYMENT',
    status: 'PAID',
    sortOrder: order,
  };
}

/** Human-readable overdue: "2 months 22 days overdue" */
export function formatOverdueHuman(daysOverdue: number): string {
  if (daysOverdue <= 0) return '';
  const months = Math.floor(daysOverdue / 30);
  const days = daysOverdue % 30;
  if (months === 0) {
    return `${days} day${days === 1 ? '' : 's'} overdue`;
  }
  if (days === 0) {
    return `${months} month${months === 1 ? '' : 's'} overdue`;
  }
  return `${months} month${months === 1 ? '' : 's'} ${days} day${days === 1 ? '' : 's'} overdue`;
}

function attachPaymentOutstandingBalances(
  events: LedgerDraft[],
  currentLoanBalance: number,
  payments: LedgerPaymentRecord[]
): LedgerEntry[] {
  const sorted = [...events].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.sortOrder - b.sortOrder;
  });

  return sorted.map((e) => {
    let outstandingBalance: number | null = null;
    if (e.entryType === 'PAYMENT') {
      const paymentsAfter = payments
        .filter((p) => p.paymentDate > e.date)
        .reduce((sum, p) => sum + p.amount, 0);
      outstandingBalance = roundLKR(
        Math.max(0, currentLoanBalance + paymentsAfter)
      );
    }
    return { ...e, outstandingBalance };
  });
}

/** Fixed-term loan ledger from persisted installment + payment records. */
export function buildFixedInstallmentLedgerEntries(
  loanStartDate: string,
  totalPayable: number,
  installments: InstallmentLedgerSource[],
  payments: LedgerPaymentRecord[],
  asOfDate: string,
  currentLoanBalance: number
): LedgerEntry[] {
  const asOf = normalizeDate(asOfDate);
  const events: LedgerDraft[] = [];
  let order = 0;

  events.push({
    date: loanStartDate,
    title: 'Loan started',
    descriptionLines: [{ label: 'Loan amount', amount: totalPayable }],
    installmentAmount: totalPayable,
    lateFeeAmount: null,
    paymentAmount: null,
    entryType: 'LOAN',
    status: currentLoanBalance <= 0 ? 'PAID' : 'PARTIAL',
    sortOrder: order++,
  });

  for (const inst of installments) {
    if (!isDateOnOrBefore(inst.dueDate, asOf)) continue;
    events.push(buildInstallmentDraft(inst, asOf, order++));
  }

  for (const p of payments) {
    events.push(buildPaymentDraft(p, order++));
  }

  return attachPaymentOutstandingBalances(events, currentLoanBalance, payments);
}

/** Interest-only loan ledger from persisted cycles + payments. */
export function buildInterestOnlyLedgerEntries(
  loanStartDate: string,
  principalAmount: number,
  cycles: LoanInterestCycle[],
  payments: LedgerPaymentRecord[],
  asOfDate: string,
  currentLoanBalance: number
): LedgerEntry[] {
  const asOf = normalizeDate(asOfDate);
  const events: LedgerDraft[] = [];
  let order = 0;

  events.push({
    date: loanStartDate,
    title: 'Loan started',
    descriptionLines: [{ label: 'Loan amount', amount: principalAmount }],
    installmentAmount: principalAmount,
    lateFeeAmount: null,
    paymentAmount: null,
    entryType: 'LOAN',
    status: currentLoanBalance <= 0 ? 'PAID' : 'PARTIAL',
    sortOrder: order++,
  });

  for (const c of cycles) {
    if (!isDateOnOrBefore(c.dueDate, asOf)) continue;
    if (c.interestDue <= 0) continue;

    const interest = roundLKR(c.interestDue);
    const interestPaid = roundLKR(c.interestPaid);
    const interestRemaining = roundLKR(Math.max(0, interest - interestPaid));

    events.push({
      date: c.dueDate,
      title: `Installment #${c.cycleNumber}`,
      descriptionLines: [
        { label: 'Interest due', amount: interest },
        { label: 'Interest paid', amount: interestPaid },
        { label: 'Interest remaining', amount: interestRemaining },
      ],
      installmentAmount: interest,
      lateFeeAmount: null,
      paymentAmount: null,
      entryType: 'INSTALLMENT',
      status: ledgerStatusFromPaidAndDue(
        interestPaid,
        interest,
        c.dueDate,
        asOf
      ),
      sortOrder: order++,
    });
  }

  for (const p of payments) {
    events.push(buildPaymentDraft(p, order++));
  }

  return attachPaymentOutstandingBalances(events, currentLoanBalance, payments);
}

/** Map confirmed payments with permanent breakdown (stored fields or allocations). */
export function mapLedgerPaymentsFromDb(
  payments: Array<{
    id: string;
    payment_date: string;
    amount: number;
    discount_amount?: number;
    payment_code: string;
    status: string;
    installment_paid?: number;
    late_fee_paid?: number;
    interest_paid?: number;
    principal_paid?: number;
  }>,
  allocations: DbPaymentAllocation[]
): LedgerPaymentRecord[] {
  return payments
    .filter((p) => p.status === 'CONFIRMED')
    .map((p) => {
      const stored: PaymentLedgerBreakdown | null =
        p.installment_paid != null ||
        p.late_fee_paid != null ||
        p.interest_paid != null ||
        p.principal_paid != null
          ? {
              installmentPaid: roundLKR(p.installment_paid ?? 0),
              lateFeePaid: roundLKR(p.late_fee_paid ?? 0),
              interestPaid: roundLKR(p.interest_paid ?? 0),
              principalPaid: roundLKR(p.principal_paid ?? 0),
              totalApplied: roundLKR(
                (p.installment_paid ?? 0) +
                  (p.late_fee_paid ?? 0) +
                  (p.interest_paid ?? 0) +
                  (p.principal_paid ?? 0)
              ),
            }
          : null;

      const breakdown =
        stored ??
        breakdownFromDbAllocations(
          allocations.filter((a) => a.payment_id === p.id)
        );

      return {
        paymentDate: p.payment_date,
        amount: roundLKR(p.amount + (p.discount_amount ?? 0)),
        reference: p.payment_code,
        installmentPaid: breakdown.installmentPaid,
        lateFeePaid: breakdown.lateFeePaid,
        interestPaid: breakdown.interestPaid,
        principalPaid: breakdown.principalPaid,
      };
    });
}

export function mapInstallmentsToLedgerSource(
  installments: Array<{
    installmentNumber: number;
    dueDate: string;
    installmentAmount: number;
    paidAmount: number;
    lateFeeAmount: number;
    lateFeePaid: number;
  }>
): InstallmentLedgerSource[] {
  return installments.map((i) => ({
    installmentNumber: i.installmentNumber,
    dueDate: i.dueDate,
    installmentAmount: i.installmentAmount,
    paidAmount: i.paidAmount,
    lateFeeAmount: i.lateFeeAmount,
    lateFeePaid: i.lateFeePaid,
  }));
}

/** Last confirmed payment date for a loan, or null. */
export function getLastPaymentDate(
  payments: Array<{ payment_date: string; status: string }>
): string | null {
  const dates = payments
    .filter((p) => p.status === 'CONFIRMED')
    .map((p) => p.payment_date)
    .sort((a, b) => b.localeCompare(a));
  return dates[0] ?? null;
}

/** Shop-friendly loan list status. */
export function getLedgerLoanStatus(
  storedStatus: string,
  balanceAmount: number
): 'ACTIVE' | 'OVERDUE' | 'COMPLETED' {
  if (
    storedStatus === 'COMPLETED' ||
    storedStatus === 'SETTLED' ||
    balanceAmount <= 0
  ) {
    return 'COMPLETED';
  }
  if (storedStatus === 'OVERDUE') return 'OVERDUE';
  return 'ACTIVE';
}
