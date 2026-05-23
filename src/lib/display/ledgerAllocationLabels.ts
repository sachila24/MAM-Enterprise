import type { AllocationType } from '../finance/paymentAllocation';
import type { DbPaymentAllocation } from '../local-db/types';
import type { DisplayMode, LabelKey } from '../i18n/simpleLabels';
import { roundLKR } from '../finance/money';
import type { LedgerAllocationLine } from './ledgerDisplay';

export interface LedgerAllocationLookup {
  installments: Array<{
    id: string;
    installmentNumber: number;
    dueDate: string;
  }>;
  interestCycles?: Array<{
    id: string;
    cycleNumber: number;
    dueDate: string;
  }>;
}

function baseAllocationType(type: AllocationType): AllocationType {
  if (type.endsWith('_DISCOUNT')) {
    return type.replace('_DISCOUNT', '') as AllocationType;
  }
  return type;
}

/** Short month from installment/cycle due date (display only). */
export function formatAllocationMonth(
  dueDate: string,
  language: DisplayMode
): string {
  const d = new Date(`${dueDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const locale = language === 'si' ? 'si-LK' : 'en-GB';
  return d.toLocaleDateString(locale, { month: 'short' });
}

function allocTypePhrase(
  type: AllocationType,
  t: (key: LabelKey) => string,
  language: DisplayMode
): string {
  const base = baseAllocationType(type);
  const lowerEn = (key: LabelKey) =>
    language === 'en' ? t(key).toLowerCase() : t(key);

  switch (base) {
    case 'LATE_FEE':
      return lowerEn('allocLateFee');
    case 'INSTALLMENT':
      return lowerEn('allocInstallment');
    case 'INTEREST':
      return lowerEn('allocInterest');
    case 'PRINCIPAL':
    case 'SETTLEMENT':
      return t('ledgerAllocPrincipalPayment');
    case 'ADVANCE':
      return t('ledgerAllocAdvancePayment');
    default:
      return t('allocInstallment');
  }
}

/** Human-readable allocation line label for ledger expand rows. */
export function formatLedgerAllocationLabel(
  allocationType: AllocationType,
  dueDate: string | undefined,
  t: (key: LabelKey) => string,
  language: DisplayMode
): string {
  const base = baseAllocationType(allocationType);
  const phrase = allocTypePhrase(allocationType, t, language);

  if (
    base === 'PRINCIPAL' ||
    base === 'ADVANCE' ||
    base === 'SETTLEMENT'
  ) {
    return phrase;
  }

  const month = dueDate ? formatAllocationMonth(dueDate, language) : '';
  if (month) return `${month} ${phrase}`;
  return phrase;
}

function dueDateForAllocation(
  row: DbPaymentAllocation,
  lookup: LedgerAllocationLookup
): string | undefined {
  if (row.installment_id) {
    return lookup.installments.find((i) => i.id === row.installment_id)
      ?.dueDate;
  }
  if (row.interest_cycle_id && lookup.interestCycles) {
    return lookup.interestCycles.find((c) => c.id === row.interest_cycle_id)
      ?.dueDate;
  }
  return undefined;
}

/** Map stored payment allocations to ledger lines in persistence order. */
export function mapDbAllocationsToLedgerLines(
  paymentId: string,
  allocations: DbPaymentAllocation[],
  lookup: LedgerAllocationLookup
): LedgerAllocationLine[] {
  return allocations
    .filter((a) => a.payment_id === paymentId && a.amount > 0)
    .map((a, index) => ({
      key: `${paymentId}-${index}-${a.allocation_type}`,
      amount: roundLKR(a.amount),
      allocationType: a.allocation_type,
      dueDate: dueDateForAllocation(a, lookup),
    }));
}

/** Grouped fallback when per-line allocations are not stored. */
export function groupedLedgerAllocationFallback(p: {
  lateFeePaid: number;
  installmentPaid: number;
  interestPaid: number;
  principalPaid: number;
}): LedgerAllocationLine[] {
  const lines: LedgerAllocationLine[] = [];
  let i = 0;
  if (p.lateFeePaid > 0) {
    lines.push({
      key: `fallback-late-${i++}`,
      amount: roundLKR(p.lateFeePaid),
      allocationType: 'LATE_FEE',
    });
  }
  if (p.installmentPaid > 0) {
    lines.push({
      key: `fallback-inst-${i++}`,
      amount: roundLKR(p.installmentPaid),
      allocationType: 'INSTALLMENT',
    });
  }
  if (p.interestPaid > 0) {
    lines.push({
      key: `fallback-int-${i++}`,
      amount: roundLKR(p.interestPaid),
      allocationType: 'INTEREST',
    });
  }
  if (p.principalPaid > 0) {
    lines.push({
      key: `fallback-prin-${i++}`,
      amount: roundLKR(p.principalPaid),
      allocationType: 'PRINCIPAL',
    });
  }
  return lines;
}

export function allocationLineColorClass(
  allocationType: AllocationType
): string {
  switch (baseAllocationType(allocationType)) {
    case 'LATE_FEE':
      return 'text-danger-700';
    case 'INSTALLMENT':
    case 'INTEREST':
      return 'text-amber-700';
    case 'PRINCIPAL':
    case 'SETTLEMENT':
      return 'text-blue-700';
    case 'ADVANCE':
      return 'text-success-700';
    default:
      return 'text-neutral-700';
  }
}
