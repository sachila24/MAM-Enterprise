import type { LoanInterestCycle } from '../../types/loan';
import type { EnrichedFixedInstallment } from '../finance/fixedInstallmentStatus';
import { monthsOverdueFromDays } from '../finance/overdueDisplay';
import { roundLKR } from '../finance/money';
import { isDateOnOrBefore, normalizeDate } from '../time/systemTime';

export interface LedgerPaymentRecord {
  paymentDate: string;
  amount: number;
  reference?: string;
}

export interface LedgerEntry {
  date: string;
  description: string;
  reference?: string;
  debit?: number;
  credit?: number;
  balance: number;
  sortOrder: number;
}

/** Human-readable overdue: "110 days overdue / 3.6 months overdue" */
export function formatOverdueHuman(daysOverdue: number): string {
  if (daysOverdue <= 0) return '';
  const months = monthsOverdueFromDays(daysOverdue);
  return `${daysOverdue} days overdue / ${months} months overdue`;
}

function applyRunningBalance(
  events: Array<Omit<LedgerEntry, 'balance'>>
): LedgerEntry[] {
  let balance = 0;
  return events.map((e) => {
    const debit = e.debit ?? 0;
    const credit = e.credit ?? 0;
    balance = roundLKR(balance + debit - credit);
    return { ...e, balance };
  });
}

/** Fixed-term loan ledger from existing schedule + engine enrichment + payments (display only). */
export function buildFixedInstallmentLedgerEntries(
  loanStartDate: string,
  totalPayable: number,
  enriched: EnrichedFixedInstallment[],
  payments: LedgerPaymentRecord[],
  asOfDate: string
): LedgerEntry[] {
  const asOf = normalizeDate(asOfDate);
  const events: Array<Omit<LedgerEntry, 'balance'>> = [];
  let order = 0;

  events.push({
    date: loanStartDate,
    description: 'Loan opened',
    debit: totalPayable,
    sortOrder: order++,
  });

  for (const inst of enriched) {
    if (!isDateOnOrBefore(inst.dueDate, asOf)) continue;

    events.push({
      date: inst.dueDate,
      description: `Installment due #${inst.installmentNumber}`,
      debit: inst.installmentAmount,
      sortOrder: order++,
    });

    if (inst.lateFeeAccrued > 0) {
      events.push({
        date: inst.dueDate,
        description: `Late fee #${inst.installmentNumber}`,
        debit: inst.lateFeeAccrued,
        sortOrder: order++,
      });
    }
  }

  for (const p of payments) {
    events.push({
      date: p.paymentDate,
      description: 'Payment received',
      reference: p.reference,
      credit: p.amount,
      sortOrder: order++,
    });
  }

  events.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.sortOrder - b.sortOrder;
  });

  return applyRunningBalance(events);
}

/** Interest-only loan ledger from cycles + payments (display only). */
export function buildInterestOnlyLedgerEntries(
  loanStartDate: string,
  principalAmount: number,
  cycles: LoanInterestCycle[],
  payments: LedgerPaymentRecord[],
  asOfDate: string
): LedgerEntry[] {
  const asOf = normalizeDate(asOfDate);
  const events: Array<Omit<LedgerEntry, 'balance'>> = [];
  let order = 0;

  events.push({
    date: loanStartDate,
    description: 'Loan opened',
    debit: principalAmount,
    sortOrder: order++,
  });

  for (const c of cycles) {
    if (!isDateOnOrBefore(c.dueDate, asOf)) continue;
    if (c.interestDue > 0) {
      events.push({
        date: c.dueDate,
        description: `Interest due cycle #${c.cycleNumber}`,
        debit: c.interestDue,
        sortOrder: order++,
      });
    }
  }

  for (const p of payments) {
    events.push({
      date: p.paymentDate,
      description: 'Payment received',
      reference: p.reference,
      credit: p.amount,
      sortOrder: order++,
    });
  }

  events.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.sortOrder - b.sortOrder;
  });

  return applyRunningBalance(events);
}

/** Map confirmed loan payments for ledger display. */
export function mapLedgerPaymentsFromDb(
  payments: Array<{
    payment_date: string;
    amount: number;
    discount_amount?: number;
    payment_code: string;
    status: string;
  }>
): LedgerPaymentRecord[] {
  return payments
    .filter((p) => p.status === 'CONFIRMED')
    .map((p) => ({
      paymentDate: p.payment_date,
      amount: roundLKR(p.amount + (p.discount_amount ?? 0)),
      reference: p.payment_code,
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
