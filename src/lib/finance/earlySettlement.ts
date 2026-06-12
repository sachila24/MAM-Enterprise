import { addMonthsSameDay } from './dueDates';
import { roundLKR } from './money';
import { isDateBefore, normalizeDate } from '../time/systemTime';

export interface InstallmentPrincipalInterestInput {
  principalComponent: number;
  interestComponent: number;
  installmentAmount: number;
  paidAmount: number;
}

export interface FixedInstallmentSettlementBalance {
  originalPrincipal: number;
  originalTotalInterest: number;
  paidPrincipal: number;
  paidInterest: number;
  remainingPrincipal: number;
  remainingInterest: number;
}

export interface EarlySettlementInput {
  startDate: string;
  asOfDate: string;
  minimumMonthsBeforeSettlement: number;
  balance: FixedInstallmentSettlementBalance;
  discountPercentage: number;
  currentMonthDue: number;
  includeCurrentMonthDue: boolean;
}

export interface EarlySettlementQuote extends FixedInstallmentSettlementBalance {
  eligible: boolean;
  earliestSettlementDate: string;
  calendarMonthsElapsed: number;
  discountPercentage: number;
  /** Discount on remaining interest only (not principal). */
  interestDiscount: number;
  /** Alias of interestDiscount for receipts and persistence. */
  discountAmount: number;
  discountedRemainingInterest: number;
  currentMonthDue: number;
  finalSettlementAmount: number;
}

const EARLY_SETTLEMENT_NOTE_PREFIX = 'EARLY_SETTLEMENT:';

/** Persisted on loan_payments.notes to link payment ↔ settlement record. */
export function earlySettlementPaymentNote(settlementCode: string): string {
  return `${EARLY_SETTLEMENT_NOTE_PREFIX}${settlementCode}`;
}

export function parseEarlySettlementPaymentNote(
  notes: string | undefined
): string | undefined {
  if (!notes?.startsWith(EARLY_SETTLEMENT_NOTE_PREFIX)) return undefined;
  const code = notes.slice(EARLY_SETTLEMENT_NOTE_PREFIX.length).trim();
  return code || undefined;
}

/** Whole calendar months elapsed from start (day-aware: partial month not counted). */
export function calendarMonthsElapsed(
  startDate: string,
  asOfDate: string
): number {
  const start = normalizeDate(startDate);
  const asOf = normalizeDate(asOfDate);
  const s = new Date(`${start}T12:00:00Z`);
  const a = new Date(`${asOf}T12:00:00Z`);
  let months =
    (a.getUTCFullYear() - s.getUTCFullYear()) * 12 +
    (a.getUTCMonth() - s.getUTCMonth());
  if (a.getUTCDate() < s.getUTCDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}

/** First calendar date on which early settlement is allowed. */
export function earliestEarlySettlementDate(
  startDate: string,
  minimumMonthsBeforeSettlement: number
): string {
  return addMonthsSameDay(startDate, minimumMonthsBeforeSettlement);
}

/**
 * Settlement allowed when as-of date is on or after start + minimum months
 * (calendar months, not paid installment count).
 */
export function canRequestEarlySettlement(
  startDate: string,
  asOfDate: string,
  minimumMonthsBeforeSettlement: number
): boolean {
  const earliest = earliestEarlySettlementDate(
    startDate,
    minimumMonthsBeforeSettlement
  );
  return !isDateBefore(asOfDate, earliest);
}

/**
 * Derive paid / remaining principal and interest from installment schedule
 * components and amounts already paid toward each installment.
 */
export function computeFixedInstallmentSettlementBalance(
  principalAmount: number,
  totalInterestAmount: number,
  installments: InstallmentPrincipalInterestInput[]
): FixedInstallmentSettlementBalance {
  let paidPrincipal = 0;
  let paidInterest = 0;

  for (const inst of installments) {
    if (inst.paidAmount <= 0 || inst.installmentAmount <= 0) continue;
    const ratio = Math.min(1, inst.paidAmount / inst.installmentAmount);
    paidPrincipal += inst.principalComponent * ratio;
    paidInterest += inst.interestComponent * ratio;
  }

  paidPrincipal = roundLKR(paidPrincipal);
  paidInterest = roundLKR(paidInterest);

  return {
    originalPrincipal: roundLKR(principalAmount),
    originalTotalInterest: roundLKR(totalInterestAmount),
    paidPrincipal,
    paidInterest,
    remainingPrincipal: roundLKR(Math.max(0, principalAmount - paidPrincipal)),
    remainingInterest: roundLKR(Math.max(0, totalInterestAmount - paidInterest)),
  };
}

/**
 * Early settlement = remaining principal + (remaining interest − discount) + optional current month due.
 * Discount applies only to remaining unpaid interest.
 */
export function calculateEarlySettlementQuote(
  input: EarlySettlementInput
): EarlySettlementQuote {
  const {
    startDate,
    asOfDate,
    minimumMonthsBeforeSettlement,
    balance,
    discountPercentage,
    currentMonthDue,
    includeCurrentMonthDue,
  } = input;

  const earliestSettlementDate = earliestEarlySettlementDate(
    startDate,
    minimumMonthsBeforeSettlement
  );
  const eligible = canRequestEarlySettlement(
    startDate,
    asOfDate,
    minimumMonthsBeforeSettlement
  );

  const interestDiscount = roundLKR(
    balance.remainingInterest * (discountPercentage / 100)
  );
  const discountedRemainingInterest = roundLKR(
    balance.remainingInterest - interestDiscount
  );
  const currentDue = includeCurrentMonthDue ? currentMonthDue : 0;
  const finalSettlementAmount = roundLKR(
    balance.remainingPrincipal + discountedRemainingInterest + currentDue
  );

  return {
    ...balance,
    eligible,
    earliestSettlementDate,
    calendarMonthsElapsed: calendarMonthsElapsed(startDate, asOfDate),
    discountPercentage,
    interestDiscount,
    discountAmount: interestDiscount,
    discountedRemainingInterest,
    currentMonthDue: roundLKR(currentDue),
    finalSettlementAmount,
  };
}
