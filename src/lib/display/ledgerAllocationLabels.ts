import type { AllocationType } from '../finance/paymentAllocation';
import type { DbPaymentAllocation } from '../local-db/types';
import type { DisplayMode, LabelKey } from '../i18n/simpleLabels';
import { roundLKR } from '../finance/money';
import type {
  LedgerAllocationLine,
  LedgerEntry,
  LedgerEntryType,
} from './ledgerDisplay';

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

/** Short calendar date for ledger (e.g. 8 Feb). */
function formatDateShort(date: string, language: DisplayMode): string {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  const locale = language === 'si' ? 'si-LK' : 'en-GB';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

/** Full month name for ledger row descriptions. */
export function formatLedgerMonthLong(
  dueDate: string,
  language: DisplayMode
): string {
  const d = new Date(`${dueDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const locale = language === 'si' ? 'si-LK' : 'en-GB';
  return d.toLocaleDateString(locale, { month: 'long' });
}

export function formatLedgerRowDescription(
  entry: Pick<
    LedgerEntry,
    | 'entryType'
    | 'description'
    | 'periodDueDate'
    | 'lateFeeSettled'
    | 'lateFeeStartDate'
  >,
  t: (key: LabelKey) => string,
  tf: (key: LabelKey, params?: Record<string, string | number>) => string,
  language: DisplayMode
): string {
  const month = entry.periodDueDate
    ? formatLedgerMonthLong(entry.periodDueDate, language)
    : '';

  switch (entry.entryType as LedgerEntryType) {
    case 'INSTALLMENT':
      return month
        ? tf('ledgerDescMonthInstallment', { month })
        : t('allocInstallment');
    case 'LATE_FEE': {
      const startLabel = entry.lateFeeStartDate
        ? formatDateShort(entry.lateFeeStartDate, language)
        : '';
      if (entry.lateFeeSettled) {
        return month
          ? tf('ledgerDescLateFeeSettledForMonth', { month, start: startLabel })
          : t('ledgerLateFeeSettled');
      }
      return month
        ? tf('ledgerDescLateFeeAccruedFrom', { month, start: startLabel })
        : t('allocLateFee');
    }
    case 'INTEREST':
      return month
        ? tf('ledgerDescMonthInterest', { month })
        : t('allocInterest');
    case 'PAYMENT':
      return t('ledgerDescPaymentReceived');
    default:
      return entry.description || '—';
  }
}

/** Compact amount for ledger cells (no currency prefix). */
export function formatLedgerAmount(amount: number): string {
  return Math.round(amount).toLocaleString('en-US');
}

/** Dotted leader line for payment breakdown (display only). */
export function formatLedgerBreakdownLine(
  label: string,
  amount: number
): { label: string; dots: string; amount: string } {
  const amountStr = formatLedgerAmount(amount);
  const targetWidth = 36;
  const used = label.length + amountStr.length + 1;
  const dotCount = Math.max(2, targetWidth - used);
  return {
    label,
    dots: '.'.repeat(dotCount),
    amount: amountStr,
  };
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

/** Short logbook-style chip: "Feb LF 1584". */
export function formatCompactAllocationChip(
  allocationType: AllocationType,
  dueDate: string | undefined,
  amount: number,
  language: DisplayMode
): string {
  const month = dueDate ? formatAllocationMonth(dueDate, language) : '';
  const base = baseAllocationType(allocationType);
  let code: string;
  if (allocationType.endsWith('_DISCOUNT')) {
    code = 'DISC';
  } else {
    switch (base) {
      case 'LATE_FEE':
        code = 'LF';
        break;
      case 'INSTALLMENT':
        code = 'INST';
        break;
      case 'INTEREST':
        code = 'INT';
        break;
      case 'PRINCIPAL':
      case 'SETTLEMENT':
        code = 'PRIN';
        break;
      case 'ADVANCE':
        code = 'ADV';
        break;
      default:
        code = 'INST';
    }
  }
  const amt = formatLedgerAmount(amount);
  return month ? `${month} ${code} ${amt}` : `${code} ${amt}`;
}

/** Human-readable allocation line label for ledger expand rows. */
export function formatLedgerAllocationLabel(
  allocationType: AllocationType,
  dueDate: string | undefined,
  t: (key: LabelKey) => string,
  language: DisplayMode
): string {
  if (allocationType.endsWith('_DISCOUNT')) {
    const month = dueDate ? formatAllocationMonth(dueDate, language) : '';
    const waiver = t('ledgerAllocDiscountApproved');
    return month ? `${month} ${waiver}` : waiver;
  }

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
