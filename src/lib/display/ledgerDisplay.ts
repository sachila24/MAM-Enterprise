import type { LoanInterestCycle } from '../../types/loan';
import type { AllocationType } from '../finance/paymentAllocation';
import { roundLKR } from '../finance/money';
import {
  breakdownFromDbAllocations,
  type PaymentLedgerBreakdown,
} from './paymentLedgerBreakdown';
import type { DbPaymentAllocation } from '../local-db/types';
import {
  groupedLedgerAllocationFallback,
  mapDbAllocationsToLedgerLines,
  type LedgerAllocationLookup,
} from './ledgerAllocationLabels';
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
  /** Per-line allocations in stored order (when available). */
  allocationLines?: LedgerAllocationLine[];
}

/** Installment snapshot for ledger (persisted + optional live engine totals). */
export interface InstallmentLedgerSource {
  installmentNumber: number;
  dueDate: string;
  installmentAmount: number;
  paidAmount: number;
  /** Historical late fee charged snapshot — never reduced after payment */
  lateFeeAmount: number;
  lateFeePaid: number;
  /** Live accrued late fee at ledger as-of (from engine; overrides display when set). */
  liveLateFeeAccrued?: number;
}

/** Display-only ledger row status. */
export type LedgerRowStatus = 'PAID' | 'PARTIAL' | 'OVERDUE';

/** Chronological ledger event kinds (display only). */
export type LedgerEntryType =
  | 'INSTALLMENT'
  | 'LATE_FEE'
  | 'INTEREST'
  | 'PAYMENT'
  | 'ADJUSTMENT';

export interface LedgerAllocationLine {
  key: string;
  amount: number;
  allocationType: AllocationType;
  /** Installment/cycle due date for month prefix (display only). */
  dueDate?: string;
}

/** Classic running-ledger row (display only). */
export interface LedgerEntry {
  date: string;
  ref: string | null;
  description: string;
  debit: number | null;
  credit: number | null;
  balance: number;
  entryType: LedgerEntryType;
  status: LedgerRowStatus;
  sortOrder: number;
  /** Payment allocation breakdown — shown in expandable detail. */
  allocationLines?: LedgerAllocationLine[];
}

type LedgerDraft = Omit<LedgerEntry, 'balance'> & {
  paymentIndex?: number;
  /** Credit applied to running arrears balance (defaults to `credit`). */
  runningCredit?: number;
};

const EVENT_SORT_PRIORITY: Record<LedgerEntryType, number> = {
  INSTALLMENT: 1,
  INTEREST: 1,
  LATE_FEE: 2,
  ADJUSTMENT: 3,
  PAYMENT: 4,
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

function liveLateFeeAccrued(inst: InstallmentLedgerSource): number {
  if (inst.liveLateFeeAccrued != null) {
    return roundLKR(inst.liveLateFeeAccrued);
  }
  return historicalLateFeeCharged(inst);
}

function installmentLedgerStatus(
  inst: InstallmentLedgerSource,
  asOf: string
): LedgerRowStatus {
  const accrued = liveLateFeeAccrued(inst);
  const totalDue = roundLKR(inst.installmentAmount + accrued);
  const totalPaid = roundLKR(inst.paidAmount + inst.lateFeePaid);
  return ledgerStatusFromPaidAndDue(totalPaid, totalDue, inst.dueDate, asOf);
}

function buildInstallmentChargedDraft(
  inst: InstallmentLedgerSource,
  asOf: string,
  order: number
): LedgerDraft {
  const installment = roundLKR(inst.installmentAmount);
  return {
    date: inst.dueDate,
    ref: null,
    description: `Installment #${inst.installmentNumber}`,
    debit: installment,
    credit: null,
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
  const lateFee = liveLateFeeAccrued(inst);
  if (lateFee <= 0) return null;

  return {
    date: inst.dueDate,
    ref: null,
    description: `Late fee #${inst.installmentNumber}`,
    debit: lateFee,
    credit: null,
    entryType: 'LATE_FEE',
    status: installmentLedgerStatus(inst, asOf),
    sortOrder: order,
  };
}

function paymentAllocationLines(p: LedgerPaymentRecord): LedgerAllocationLine[] {
  if (p.allocationLines && p.allocationLines.length > 0) {
    return p.allocationLines;
  }
  return groupedLedgerAllocationFallback(p);
}

/** Amount applied to schedule/arrears (excludes principal prepayment and advance). */
function paymentArrearsCredit(p: LedgerPaymentRecord): number {
  const applied = roundLKR(
    p.installmentPaid + p.lateFeePaid + p.interestPaid
  );
  if (applied > 0) return applied;
  return roundLKR(p.amount);
}

function buildPaymentDraft(
  p: LedgerPaymentRecord,
  order: number,
  paymentIndex: number
): LedgerDraft {
  const ref = p.reference?.trim() || null;
  const description = 'Payment received';

  return {
    date: p.paymentDate,
    ref,
    description,
    debit: null,
    credit: roundLKR(p.amount),
    runningCredit: paymentArrearsCredit(p),
    entryType: 'PAYMENT',
    status: 'PAID',
    sortOrder: order,
    paymentIndex,
    allocationLines: paymentAllocationLines(p),
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

/** Running arrears balance: debits increase liability, credits reduce it. */
function attachRunningBalances(events: LedgerDraft[]): LedgerEntry[] {
  const sorted = [...events].sort(compareLedgerEvents);
  let balance = 0;

  return sorted.map((e) => {
    const debit = e.debit ?? 0;
    const credit = e.runningCredit ?? e.credit ?? 0;
    balance = roundLKR(Math.max(0, balance + debit - credit));
    const { paymentIndex: _pi, runningCredit: _rc, ...row } = e;
    return { ...row, balance };
  });
}

function appendInstallmentEvents(
  events: LedgerDraft[],
  inst: InstallmentLedgerSource,
  asOf: string,
  order: { value: number }
): void {
  events.push(buildInstallmentChargedDraft(inst, asOf, order.value++));
  const lateFee = buildLateFeeChargedDraft(inst, asOf, order.value);
  if (lateFee) {
    events.push(lateFee);
    order.value++;
  }
}

/** Fixed-term loan ledger from persisted installment + payment records. */
export function buildFixedInstallmentLedgerEntries(
  _loanStartDate: string,
  _totalPayable: number,
  installments: InstallmentLedgerSource[],
  payments: LedgerPaymentRecord[],
  asOfDate: string
): LedgerEntry[] {
  const asOf = normalizeDate(asOfDate);
  const events: LedgerDraft[] = [];
  let order = 0;

  const orderRef = { value: order };
  for (const inst of installments) {
    if (!isDateOnOrBefore(inst.dueDate, asOf)) continue;
    appendInstallmentEvents(events, inst, asOf, orderRef);
  }
  order = orderRef.value;

  payments.forEach((p, i) => {
    events.push(buildPaymentDraft(p, order++, i));
  });

  return attachRunningBalances(events);
}

/** Interest-only loan ledger from persisted cycles + payments. */
export function buildInterestOnlyLedgerEntries(
  _loanStartDate: string,
  _principalAmount: number,
  cycles: LoanInterestCycle[],
  payments: LedgerPaymentRecord[],
  asOfDate: string
): LedgerEntry[] {
  const asOf = normalizeDate(asOfDate);
  const events: LedgerDraft[] = [];
  let order = 0;

  for (const c of cycles) {
    if (!isDateOnOrBefore(c.dueDate, asOf)) continue;
    if (c.interestDue <= 0) continue;

    const interest = roundLKR(c.interestDue);
    const interestPaid = roundLKR(c.interestPaid);

    events.push({
      date: c.dueDate,
      ref: null,
      description: `Interest #${c.cycleNumber}`,
      debit: interest,
      credit: null,
      entryType: 'INTEREST',
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

  return attachRunningBalances(events);
}

export type { LedgerAllocationLookup };

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
  allocations: DbPaymentAllocation[],
  lookup?: LedgerAllocationLookup
): LedgerPaymentRecord[] {
  return payments
    .filter((p) => p.status === 'CONFIRMED')
    .map((p) => {
      const paymentAllocations = allocations.filter((a) => a.payment_id === p.id);
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
        stored ?? breakdownFromDbAllocations(paymentAllocations);

      const detailLines =
        lookup && paymentAllocations.length > 0
          ? mapDbAllocationsToLedgerLines(p.id, allocations, lookup)
          : undefined;

      return {
        paymentDate: p.payment_date,
        amount: roundLKR(p.amount + (p.discount_amount ?? 0)),
        reference: p.payment_code,
        installmentPaid: breakdown.installmentPaid,
        lateFeePaid: breakdown.lateFeePaid,
        interestPaid: breakdown.interestPaid,
        principalPaid: breakdown.principalPaid,
        allocationLines: detailLines,
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
    liveLateFeeAccrued?: number;
  }>
): InstallmentLedgerSource[] {
  return installments.map((i) => ({
    installmentNumber: i.installmentNumber,
    dueDate: i.dueDate,
    installmentAmount: i.installmentAmount,
    paidAmount: i.paidAmount,
    lateFeeAmount: roundLKR(Math.max(i.lateFeeAmount, i.lateFeePaid)),
    lateFeePaid: i.lateFeePaid,
    liveLateFeeAccrued: i.liveLateFeeAccrued,
  }));
}

/** Merge live engine accrued amounts into ledger installment rows. */
export function enrichLedgerInstallmentsWithLiveLateFees(
  installments: InstallmentLedgerSource[],
  liveByNumber: Map<number, number>
): InstallmentLedgerSource[] {
  return installments.map((inst) => ({
    ...inst,
    liveLateFeeAccrued:
      liveByNumber.get(inst.installmentNumber) ?? inst.liveLateFeeAccrued,
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
