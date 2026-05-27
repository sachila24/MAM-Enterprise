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
import { getLateFeeStartDate } from '../finance/lateFeeEngineV3';
import {
  isDateBefore,
  isDateOnOrBefore,
  normalizeDate,
} from '../time/systemTime';

export interface LedgerPaymentRecord {
  paymentDate: string;
  /** Cash received from customer (excludes discount/waiver). */
  cashReceived: number;
  /** Approved discount / waiver (not customer cash). */
  discountAmount: number;
  /** @deprecated Use cashReceived */
  amount: number;
  reference?: string;
  installmentPaid: number;
  lateFeePaid: number;
  interestPaid: number;
  principalPaid: number;
  /** Per-line allocations in stored order (when available). */
  allocationLines?: LedgerAllocationLine[];
  ioSettlementKind?: IoPrincipalSettlementKind;
  ioSettlementLabel?: string;
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
  /** Late-fee balance fully paid — monthly accumulation stopped. */
  lateFeeSettled?: boolean;
  /** First day late-fee cycles accrue (due + grace). */
  lateFeeStartDate?: string;
}

/** Display-only ledger row status. */
export type LedgerRowStatus = 'PAID' | 'PARTIAL' | 'OVERDUE';

/** Chronological ledger event kinds (display only). */
export type LedgerEntryType =
  | 'LOAN_OPENING'
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
  /** Overrides default allocation phrase (e.g. principal settlement). */
  customLabel?: string;
}

export type IoPrincipalSettlementKind = 'HALF' | 'FULL';

export function parseIoPrincipalSettlementKind(
  notes: string | undefined
): IoPrincipalSettlementKind | undefined {
  if (notes === 'IO_SETTLEMENT:HALF') return 'HALF';
  if (notes === 'IO_SETTLEMENT:FULL') return 'FULL';
  return undefined;
}

/** Classic running-ledger row (display only). */
export interface LedgerEntry {
  date: string;
  ref: string | null;
  description: string;
  debit: number | null;
  credit: number | null;
  /** Live amount customer must pay now (arrears, late fees, penalties). */
  balance: number;
  /** Remaining contract loan (total payable minus installment allocations only). */
  loanTotalBalance?: number;
  entryType: LedgerEntryType;
  status: LedgerRowStatus;
  sortOrder: number;
  /** Installment/cycle due date for month-based labels (display). */
  periodDueDate?: string;
  installmentNumber?: number;
  cycleNumber?: number;
  /** LATE_FEE row: late-fee balance fully paid. */
  lateFeeSettled?: boolean;
  /** LATE_FEE row: grace-end / cycle-start date. */
  lateFeeStartDate?: string;
  /** Payment allocation breakdown — inline under payment rows. */
  allocationLines?: LedgerAllocationLine[];
  /** Cash received (payment rows only). */
  paymentCashReceived?: number;
  /** Discount / waiver on this payment (payment rows only). */
  paymentDiscountAmount?: number;
  /** Installment overdue but still inside 7-day grace (display only). */
  inGracePeriod?: boolean;
  /** Per-calendar-month late fee cycles from engine (display only). */
  lateFeeCycleLines?: Array<{ key: string; label: string; amount: number }>;
}

type LedgerDraft = Omit<LedgerEntry, 'balance' | 'loanTotalBalance'> & {
  paymentIndex?: number;
  /** Debit applied to current due balance (defaults to `debit`; LOAN_OPENING uses 0). */
  runningDebit?: number;
  /** Credit applied to running arrears balance (defaults to `credit`). */
  runningCredit?: number;
  /** Credit applied to total loan balance (installment allocations only). */
  loanBalanceCredit?: number;
};

export interface FixedInstallmentLedgerOptions {
  /** Official loan invoice document number (e.g. LN-2026-000001). */
  loanOpeningRef?: string | null;
}

export interface InterestOnlyLedgerOptions {
  /** Loan creation invoice (LN-…). Not Loan Release Note (RLN). */
  loanOpeningRef?: string | null;
}

const EVENT_SORT_PRIORITY: Record<LedgerEntryType, number> = {
  LOAN_OPENING: 0,
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

function ledgerInstallmentRef(installmentNumber: number): string {
  return `INST-${String(installmentNumber).padStart(3, '0')}`;
}

function ledgerLateFeeRef(installmentNumber: number): string {
  return `DI-${String(installmentNumber).padStart(3, '0')}`;
}

function buildLoanOpeningDraft(
  loanStartDate: string,
  ref: string,
  totalPayable: number,
  order: number
): LedgerDraft {
  const amount = roundLKR(totalPayable);
  return {
    date: loanStartDate,
    ref,
    description: '',
    debit: amount,
    /** Charge only — current due builds from installment/late-fee rows. */
    runningDebit: 0,
    credit: null,
    entryType: 'LOAN_OPENING',
    status: 'PAID',
    sortOrder: order,
  };
}

function buildInstallmentChargedDraft(
  inst: InstallmentLedgerSource,
  asOf: string,
  order: number
): LedgerDraft {
  const installment = roundLKR(inst.installmentAmount);
  const charged = historicalLateFeeCharged(inst);
  const lateFeeSettled =
    inst.lateFeeSettled ??
    (inst.lateFeePaid > 0 && inst.lateFeePaid >= charged && charged > 0);
  const lateFeeStartDate =
    inst.lateFeeStartDate ?? getLateFeeStartDate(inst.dueDate);

  return {
    date: inst.dueDate,
    ref: ledgerInstallmentRef(inst.installmentNumber),
    description: '',
    debit: installment,
    credit: null,
    entryType: 'INSTALLMENT',
    status: installmentLedgerStatus(inst, asOf),
    sortOrder: order,
    periodDueDate: inst.dueDate,
    installmentNumber: inst.installmentNumber,
    lateFeeSettled: charged > 0 ? lateFeeSettled : undefined,
    lateFeeStartDate,
  };
}

function buildLateFeeChargedDraft(
  inst: InstallmentLedgerSource,
  asOf: string,
  order: number
): LedgerDraft | null {
  const lateFee = liveLateFeeAccrued(inst);
  const charged = historicalLateFeeCharged(inst);
  if (lateFee <= 0 && charged <= 0) return null;

  const lateFeeSettled =
    inst.lateFeeSettled ??
    (inst.lateFeePaid > 0 && inst.lateFeePaid >= charged && charged > 0);
  const displayFee = lateFee > 0 ? lateFee : charged;
  const lateFeeStartDate =
    inst.lateFeeStartDate ?? getLateFeeStartDate(inst.dueDate);

  return {
    date: lateFeeStartDate,
    ref: ledgerLateFeeRef(inst.installmentNumber),
    description: '',
    debit: displayFee,
    credit: null,
    entryType: 'LATE_FEE',
    status: lateFeeSettled
      ? 'PAID'
      : ledgerStatusFromPaidAndDue(
          inst.lateFeePaid,
          displayFee,
          inst.dueDate,
          asOf
        ),
    sortOrder: order,
    periodDueDate: inst.dueDate,
    installmentNumber: inst.installmentNumber,
    lateFeeSettled,
    lateFeeStartDate,
  };
}

function paymentAllocationLines(p: LedgerPaymentRecord): LedgerAllocationLine[] {
  if (p.allocationLines && p.allocationLines.length > 0) {
    return p.allocationLines;
  }
  const fallback = groupedLedgerAllocationFallback(p);
  if (p.ioSettlementKind && p.ioSettlementLabel) {
    return fallback.map((line) =>
      line.allocationType === 'PRINCIPAL'
        ? { ...line, customLabel: p.ioSettlementLabel }
        : line
    );
  }
  return fallback;
}

/** Installment + installment-discount allocations only (total loan balance). */
function paymentLoanBalanceCredit(p: LedgerPaymentRecord): number {
  if (p.allocationLines && p.allocationLines.length > 0) {
    let sum = 0;
    for (const line of p.allocationLines) {
      if (
        line.allocationType === 'INSTALLMENT' ||
        line.allocationType === 'INSTALLMENT_DISCOUNT'
      ) {
        sum += line.amount;
      }
    }
    if (sum > 0) return roundLKR(sum);
  }
  return roundLKR(p.installmentPaid);
}

/** Principal reductions for interest-only total loan balance column. */
function paymentInterestOnlyLoanBalanceCredit(p: LedgerPaymentRecord): number {
  if (p.allocationLines && p.allocationLines.length > 0) {
    let sum = 0;
    for (const line of p.allocationLines) {
      if (
        line.allocationType === 'PRINCIPAL' ||
        line.allocationType === 'PRINCIPAL_DISCOUNT'
      ) {
        sum += line.amount;
      }
    }
    if (sum > 0) return roundLKR(sum);
  }
  return roundLKR(p.principalPaid);
}

/** Amount applied to schedule/arrears (excludes principal prepayment and advance). */
function paymentArrearsCredit(p: LedgerPaymentRecord): number {
  const applied = roundLKR(
    p.installmentPaid + p.lateFeePaid + p.interestPaid
  );
  if (applied > 0) return applied;
  return roundLKR(p.cashReceived + p.discountAmount);
}

function buildPaymentDraft(
  p: LedgerPaymentRecord,
  order: number,
  paymentIndex: number
): LedgerDraft {
  const ref =
    p.reference?.trim() ||
    `PAY-${String(paymentIndex + 1).padStart(4, '0')}`;
  const description = '';

  return {
    date: p.paymentDate,
    ref,
    description,
    debit: null,
    credit: roundLKR(p.cashReceived),
    runningCredit: paymentArrearsCredit(p),
    loanBalanceCredit: paymentLoanBalanceCredit(p),
    entryType: 'PAYMENT',
    status: 'PAID',
    sortOrder: order,
    paymentIndex,
    allocationLines: paymentAllocationLines(p),
    paymentCashReceived: roundLKR(p.cashReceived),
    paymentDiscountAmount: roundLKR(p.discountAmount),
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

/** Running arrears + optional total loan balance (display only). */
function attachRunningBalances(
  events: LedgerDraft[],
  trackLoanTotalBalance = false
): LedgerEntry[] {
  const sorted = [...events].sort(compareLedgerEvents);
  let balance = 0;
  let loanTotalBalance: number | undefined;

  return sorted.map((e) => {
    const dueDebit =
      e.runningDebit !== undefined ? e.runningDebit : (e.debit ?? 0);
    const credit = e.runningCredit ?? e.credit ?? 0;
    balance = roundLKR(balance + dueDebit - credit);

    if (trackLoanTotalBalance) {
      if (e.entryType === 'LOAN_OPENING') {
        loanTotalBalance = roundLKR(e.debit ?? 0);
      } else if (e.entryType === 'PAYMENT') {
        const loanCredit = e.loanBalanceCredit ?? 0;
        loanTotalBalance = roundLKR(
          Math.max(0, (loanTotalBalance ?? 0) - loanCredit)
        );
      }
    }

    const {
      paymentIndex: _pi,
      runningCredit: _rc,
      runningDebit: _rd,
      loanBalanceCredit: _lbc,
      ...row
    } = e;
    return {
      ...row,
      balance,
      loanTotalBalance: trackLoanTotalBalance ? loanTotalBalance : undefined,
    };
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
  loanStartDate: string,
  totalPayable: number,
  installments: InstallmentLedgerSource[],
  payments: LedgerPaymentRecord[],
  asOfDate: string,
  options?: FixedInstallmentLedgerOptions
): LedgerEntry[] {
  const asOf = normalizeDate(asOfDate);
  const events: LedgerDraft[] = [];
  let order = 0;

  const totalPayableR = roundLKR(totalPayable);
  const trackLoanTotalBalance = totalPayableR > 0;

  if (trackLoanTotalBalance) {
    const openingRef =
      options?.loanOpeningRef?.trim() || null;
    events.push(
      buildLoanOpeningDraft(
        loanStartDate,
        openingRef ?? '—',
        totalPayableR,
        order++
      )
    );
  }

  const orderRef = { value: order };
  for (const inst of installments) {
    if (!isDateOnOrBefore(inst.dueDate, asOf)) continue;
    appendInstallmentEvents(events, inst, asOf, orderRef);
  }
  order = orderRef.value;

  payments.forEach((p, i) => {
    events.push(buildPaymentDraft(p, order++, i));
  });

  return attachRunningBalances(events, trackLoanTotalBalance);
}

/**
 * Interest-only loan ledger (display only).
 * Opening principal (Loan released, LN ref) → interest → payments / settlements.
 * Loan Release Note (RLN) is document-only and must not be used as opening ref.
 */
export function buildInterestOnlyLedgerEntries(
  loanStartDate: string,
  originalPrincipal: number,
  cycles: LoanInterestCycle[],
  payments: LedgerPaymentRecord[],
  asOfDate: string,
  options?: InterestOnlyLedgerOptions
): LedgerEntry[] {
  const asOf = normalizeDate(asOfDate);
  const events: LedgerDraft[] = [];
  let order = 0;

  const principalR = roundLKR(originalPrincipal);
  const trackLoanTotalBalance = principalR > 0;

  if (trackLoanTotalBalance) {
    const openingRef = options?.loanOpeningRef?.trim() || null;
    events.push(
      buildLoanOpeningDraft(
        loanStartDate,
        openingRef ?? '—',
        principalR,
        order++
      )
    );
  }

  for (const c of cycles) {
    if (!isDateOnOrBefore(c.dueDate, asOf)) continue;
    if (c.interestDue <= 0) continue;

    const interest = roundLKR(c.interestDue);
    const interestPaid = roundLKR(c.interestPaid);

    events.push({
      date: c.dueDate,
      ref: `INT-${String(c.cycleNumber).padStart(3, '0')}`,
      description: '',
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
      periodDueDate: c.dueDate,
      cycleNumber: c.cycleNumber,
    });
  }

  payments.forEach((p, i) => {
    const draft = buildPaymentDraft(p, order++, i);
    if (trackLoanTotalBalance) {
      draft.loanBalanceCredit = paymentInterestOnlyLoanBalanceCredit(p);
    }
    events.push(draft);
  });

  return attachRunningBalances(events, trackLoanTotalBalance);
}

export type { LedgerAllocationLookup };

/** Map confirmed payments with permanent breakdown (stored fields or allocations). */
function applyIoSettlementLabels(
  lines: LedgerAllocationLine[] | undefined,
  settlementKind: IoPrincipalSettlementKind | undefined,
  labelHalf: string,
  labelFull: string
): LedgerAllocationLine[] | undefined {
  if (!lines?.length || !settlementKind) return lines;
  const customLabel = settlementKind === 'HALF' ? labelHalf : labelFull;
  return lines.map((line) =>
    line.allocationType === 'PRINCIPAL'
      ? { ...line, customLabel }
      : line
  );
}

export function mapLedgerPaymentsFromDb(
  payments: Array<{
    id: string;
    payment_date: string;
    amount: number;
    discount_amount?: number;
    payment_code: string;
    receipt_number?: string;
    status: string;
    notes?: string;
    installment_paid?: number;
    late_fee_paid?: number;
    interest_paid?: number;
    principal_paid?: number;
  }>,
  allocations: DbPaymentAllocation[],
  lookup?: LedgerAllocationLookup,
  ioSettlementLabels?: { half: string; full: string }
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

      const settlementKind = parseIoPrincipalSettlementKind(p.notes);
      let detailLines =
        lookup && paymentAllocations.length > 0
          ? mapDbAllocationsToLedgerLines(p.id, allocations, lookup)
          : undefined;
      if (ioSettlementLabels && settlementKind) {
        detailLines = applyIoSettlementLabels(
          detailLines,
          settlementKind,
          ioSettlementLabels.half,
          ioSettlementLabels.full
        );
      }

      const cashReceived = roundLKR(p.amount);
      const discountAmount = roundLKR(p.discount_amount ?? 0);

      return {
        paymentDate: p.payment_date,
        cashReceived,
        discountAmount,
        amount: cashReceived,
        reference: p.receipt_number?.trim() || p.payment_code,
        installmentPaid: breakdown.installmentPaid,
        lateFeePaid: breakdown.lateFeePaid,
        interestPaid: breakdown.interestPaid,
        principalPaid: breakdown.principalPaid,
        allocationLines: detailLines,
        ioSettlementKind: settlementKind,
        ioSettlementLabel:
          settlementKind && ioSettlementLabels
            ? settlementKind === 'HALF'
              ? ioSettlementLabels.half
              : ioSettlementLabels.full
            : undefined,
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
  liveByNumber: Map<number, number>,
  settledByNumber?: Map<number, boolean>,
  startDateByNumber?: Map<number, string>
): InstallmentLedgerSource[] {
  return installments.map((inst) => ({
    ...inst,
    liveLateFeeAccrued:
      liveByNumber.get(inst.installmentNumber) ?? inst.liveLateFeeAccrued,
    lateFeeSettled:
      settledByNumber?.get(inst.installmentNumber) ?? inst.lateFeeSettled,
    lateFeeStartDate:
      startDateByNumber?.get(inst.installmentNumber) ?? inst.lateFeeStartDate,
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
