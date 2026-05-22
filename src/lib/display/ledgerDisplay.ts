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

/** Chronological ledger event kinds (display only). */
export type LedgerEntryType = 'LOAN' | 'INSTALLMENT' | 'LATE_FEE' | 'PAYMENT';

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
  /** Loan balance after this event. */
  outstandingBalance: number | null;
  sortOrder: number;
}

type LedgerDraft = Omit<LedgerEntry, 'outstandingBalance'> & {
  paymentIndex?: number;
};

const EVENT_SORT_PRIORITY: Record<LedgerEntryType, number> = {
  LOAN: 0,
  INSTALLMENT: 1,
  LATE_FEE: 2,
  PAYMENT: 3,
};

/** Charged late fee for ledger — never below what was already paid. */
export function historicalLateFeeCharged(inst: InstallmentLedgerSource): number {
  return roundLKR(Math.max(inst.lateFeeAmount, inst.lateFeePaid));
}

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
  const lateCharged = historicalLateFeeCharged(inst);
  const totalDue = roundLKR(inst.installmentAmount + lateCharged);
  const totalPaid = roundLKR(inst.paidAmount + inst.lateFeePaid);
  return ledgerStatusFromPaidAndDue(totalPaid, totalDue, inst.dueDate, asOf);
}

function lateFeeDescriptionLines(
  inst: InstallmentLedgerSource
): LedgerDescriptionLine[] {
  const lateCharged = historicalLateFeeCharged(inst);
  const latePaid = roundLKR(inst.lateFeePaid);
  const lateRemaining = roundLKR(Math.max(0, lateCharged - latePaid));
  return [
    { label: 'Late fee charged', amount: lateCharged },
    { label: 'Late fee paid', amount: latePaid },
    { label: 'Late fee remaining', amount: lateRemaining },
  ];
}

function buildInstallmentChargedDraft(
  inst: InstallmentLedgerSource,
  asOf: string,
  order: number
): LedgerDraft {
  const installment = roundLKR(inst.installmentAmount);
  const installmentPaid = roundLKR(inst.paidAmount);
  const installmentRemaining = roundLKR(
    Math.max(0, installment - installmentPaid)
  );

  const descriptionLines: LedgerDescriptionLine[] = [
    { label: 'Installment charged', amount: installment },
    { label: 'Installment paid', amount: installmentPaid },
    { label: 'Installment remaining', amount: installmentRemaining },
    ...lateFeeDescriptionLines(inst),
  ];

  return {
    date: inst.dueDate,
    title: `Installment charged #${inst.installmentNumber}`,
    descriptionLines,
    installmentAmount: installment,
    lateFeeAmount: null,
    paymentAmount: null,
    entryType: 'INSTALLMENT',
    status: installmentLedgerStatus(inst, asOf),
    sortOrder: order,
  };
}

function buildLateFeeChargedDraft(
  inst: InstallmentLedgerSource,
  asOf: string,
  order: number
): LedgerDraft | null {
  const lateCharged = historicalLateFeeCharged(inst);
  if (lateCharged <= 0) return null;

  return {
    date: inst.dueDate,
    title: `Late fee charged #${inst.installmentNumber}`,
    descriptionLines: lateFeeDescriptionLines(inst),
    installmentAmount: null,
    lateFeeAmount: lateCharged,
    paymentAmount: null,
    entryType: 'LATE_FEE',
    status: installmentLedgerStatus(inst, asOf),
    sortOrder: order,
  };
}

function buildPaymentDraft(
  p: LedgerPaymentRecord,
  order: number,
  paymentIndex: number
): LedgerDraft {
  const refSuffix = p.reference ? ` (${p.reference})` : '';
  const descriptionLines: LedgerDescriptionLine[] = [
    { label: 'Total payment received', amount: p.amount },
    { label: 'Applied to late fees', amount: roundLKR(p.lateFeePaid) },
    { label: 'Applied to installment', amount: roundLKR(p.installmentPaid) },
    { label: 'Applied to principal', amount: roundLKR(p.principalPaid) },
  ];
  if (p.interestPaid > 0) {
    descriptionLines.push({
      label: 'Applied to interest',
      amount: roundLKR(p.interestPaid),
    });
  }

  return {
    date: p.paymentDate,
    title: `Payment received${refSuffix}`,
    descriptionLines,
    installmentAmount:
      p.installmentPaid > 0 ? roundLKR(p.installmentPaid) : null,
    lateFeeAmount: p.lateFeePaid > 0 ? roundLKR(p.lateFeePaid) : null,
    paymentAmount: p.amount,
    entryType: 'PAYMENT',
    status: 'PAID',
    sortOrder: order,
    paymentIndex,
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

function compareLedgerEvents(a: LedgerDraft, b: LedgerDraft): number {
  const d = a.date.localeCompare(b.date);
  if (d !== 0) return d;
  const typeOrder =
    EVENT_SORT_PRIORITY[a.entryType] - EVENT_SORT_PRIORITY[b.entryType];
  if (typeOrder !== 0) return typeOrder;
  return a.sortOrder - b.sortOrder;
}

function paymentBalanceReduction(
  payment: LedgerPaymentRecord,
  interestOnly: boolean
): number {
  if (interestOnly) return roundLKR(payment.principalPaid);
  return roundLKR(payment.installmentPaid + payment.principalPaid);
}

/** Running loan balance after each chronological event. */
function attachRunningOutstandingBalances(
  events: LedgerDraft[],
  openingBalance: number,
  payments: LedgerPaymentRecord[],
  interestOnly: boolean
): LedgerEntry[] {
  const sorted = [...events].sort(compareLedgerEvents);
  let balance = roundLKR(openingBalance);

  return sorted.map((e) => {
    if (e.entryType === 'LOAN') {
      balance = roundLKR(openingBalance);
    } else if (e.entryType === 'PAYMENT' && e.paymentIndex != null) {
      const payment = payments[e.paymentIndex];
      balance = roundLKR(
        Math.max(0, balance - paymentBalanceReduction(payment, interestOnly))
      );
    }

    const { paymentIndex: _pi, ...row } = e;
    return { ...row, outstandingBalance: balance };
  });
}

function appendInstallmentEvents(
  events: LedgerDraft[],
  inst: InstallmentLedgerSource,
  asOf: string,
  order: { value: number }
): void {
  events.push(buildInstallmentChargedDraft(inst, asOf, order.value++));
  const lateFeeEvent = buildLateFeeChargedDraft(inst, asOf, order.value++);
  if (lateFeeEvent) events.push(lateFeeEvent);
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

  const orderRef = { value: order };
  for (const inst of installments) {
    if (!isDateOnOrBefore(inst.dueDate, asOf)) continue;
    appendInstallmentEvents(events, inst, asOf, orderRef);
  }
  order = orderRef.value;

  payments.forEach((p, i) => {
    events.push(buildPaymentDraft(p, order++, i));
  });

  return reconcileLedgerBalance(
    attachRunningOutstandingBalances(events, totalPayable, payments, false),
    currentLoanBalance
  );
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
      title: `Installment charged #${c.cycleNumber}`,
      descriptionLines: [
        { label: 'Interest charged', amount: interest },
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

  payments.forEach((p, i) => {
    events.push(buildPaymentDraft(p, order++, i));
  });

  return reconcileLedgerBalance(
    attachRunningOutstandingBalances(events, principalAmount, payments, true),
    currentLoanBalance
  );
}

function reconcileLedgerBalance(
  entries: LedgerEntry[],
  currentLoanBalance: number
): LedgerEntry[] {
  if (entries.length === 0 || currentLoanBalance < 0) return entries;
  const lastPayment = [...entries].reverse().find((e) => e.entryType === 'PAYMENT');
  if (
    lastPayment &&
    lastPayment.outstandingBalance !== roundLKR(currentLoanBalance)
  ) {
    lastPayment.outstandingBalance = roundLKR(currentLoanBalance);
  }
  return entries;
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
    lateFeeAmount: roundLKR(Math.max(i.lateFeeAmount, i.lateFeePaid)),
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
