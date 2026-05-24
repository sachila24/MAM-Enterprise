import { addMonthsSameDay } from '../finance/dueDates';
import { getLateFeeStartDate } from '../finance/lateFeeEngineV3';
import type { LateFeeEngineLine } from '../finance/lateFeeEngineV3';
import { roundLKR } from '../finance/money';
import type { DisplayMode } from '../i18n/simpleLabels';
import { isDateBefore, normalizeDate } from '../time/systemTime';
import type { LedgerEntry } from './ledgerDisplay';
import { formatAllocationMonth } from './ledgerAllocationLabels';

export interface LedgerLateFeeCycleLine {
  key: string;
  label: string;
  amount: number;
}

export interface LedgerMonthGroup {
  monthKey: string;
  monthLabel: string;
  entries: LedgerEntry[];
  defaultExpanded: boolean;
}

function monthKeyFromDate(isoDate: string): string {
  return normalizeDate(isoDate).slice(0, 7);
}

/** YYYY-MM bucket for ledger month sections. */
export function ledgerEntryMonthKey(entry: LedgerEntry): string {
  if (entry.entryType === 'PAYMENT') {
    return monthKeyFromDate(entry.date);
  }
  if (entry.periodDueDate) {
    return monthKeyFromDate(entry.periodDueDate);
  }
  return monthKeyFromDate(entry.date);
}

/** "February 2026" style section title. */
export function formatLedgerMonthYear(
  monthKey: string,
  language: DisplayMode
): string {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  const locale = language === 'si' ? 'si-LK' : 'en-GB';
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

/** Per-cycle late fee lines from engine (display only — no recalculation). */
export function buildLateFeeCycleLines(
  lateFeeStartDate: string,
  lateMonths: number,
  baseLateFee: number,
  language: DisplayMode,
  tf: (key: string, params: Record<string, string | number>) => string
): LedgerLateFeeCycleLine[] {
  if (lateMonths <= 0 || baseLateFee <= 0) return [];

  const lines: LedgerLateFeeCycleLine[] = [];
  for (let i = 0; i < lateMonths; i++) {
    const cycleDate =
      i === 0 ? lateFeeStartDate : addMonthsSameDay(lateFeeStartDate, i);
    const month = formatAllocationMonth(cycleDate, language);
    lines.push({
      key: `cycle-${i}-${month}`,
      label: tf('ledgerLateFeeCycle', { month }),
      amount: roundLKR(baseLateFee),
    });
  }
  return lines;
}

export function mapLateFeeEngineLines(
  lines: LateFeeEngineLine[]
): Map<
  number,
  Pick<LateFeeEngineLine, 'lateMonths' | 'baseLateFee' | 'lateFeeStartDate'>
> {
  return new Map(
    lines.map((line) => [
      line.installmentNumber,
      {
        lateMonths: line.lateMonths,
        baseLateFee: line.baseLateFee,
        lateFeeStartDate: line.lateFeeStartDate,
      },
    ])
  );
}

/** Attach grace-period and late-fee cycle display fields (engine data only). */
export function enrichLedgerEntriesForDisplay(
  entries: LedgerEntry[],
  asOfDate: string,
  lateFeeByInstallment?: Map<
    number,
    Pick<LateFeeEngineLine, 'lateMonths' | 'baseLateFee' | 'lateFeeStartDate'>
  >,
  language?: DisplayMode,
  labels?: {
    tf: (key: string, params: Record<string, string | number>) => string;
  }
): LedgerEntry[] {
  const asOf = normalizeDate(asOfDate);

  return entries.map((entry) => {
    const next: LedgerEntry = { ...entry };

    if (
      entry.entryType === 'INSTALLMENT' &&
      entry.periodDueDate &&
      entry.status !== 'PAID'
    ) {
      const due = entry.periodDueDate;
      const lateFeeStart =
        entry.lateFeeStartDate ?? getLateFeeStartDate(due);
      next.lateFeeStartDate = lateFeeStart;
      next.inGracePeriod =
        isDateBefore(due, asOf) && isDateBefore(asOf, lateFeeStart);
    }

    if (
      entry.entryType === 'LATE_FEE' &&
      entry.installmentNumber != null &&
      lateFeeByInstallment &&
      labels &&
      language
    ) {
      const engine = lateFeeByInstallment.get(entry.installmentNumber);
      if (engine && engine.lateMonths > 0) {
        next.lateFeeCycleLines = buildLateFeeCycleLines(
          engine.lateFeeStartDate,
          engine.lateMonths,
          engine.baseLateFee,
          language,
          labels.tf
        );
      }
    }

    return next;
  });
}

const RECENT_EXPANDED_MONTH_COUNT = 3;

function monthIndex(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number);
  return y * 12 + (m - 1);
}

/** Current month and two prior months expanded; older collapsed. */
export function groupLedgerEntriesByMonth(
  entries: LedgerEntry[],
  asOfDate: string,
  language: DisplayMode
): LedgerMonthGroup[] {
  const asOfMonth = monthKeyFromDate(asOfDate);
  const buckets = new Map<string, LedgerEntry[]>();

  for (const entry of entries) {
    const key = ledgerEntryMonthKey(entry);
    const list = buckets.get(key) ?? [];
    list.push(entry);
    buckets.set(key, list);
  }

  const monthKeys = [...buckets.keys()].sort((a, b) => a.localeCompare(b));
  const asOfIdx = monthIndex(asOfMonth);

  return monthKeys.map((monthKey) => {
    const entriesInMonth = buckets.get(monthKey) ?? [];
    const idx = monthIndex(monthKey);
    const monthsBehind = asOfIdx - idx;
    const defaultExpanded =
      monthsBehind >= 0 && monthsBehind < RECENT_EXPANDED_MONTH_COUNT;

    return {
      monthKey,
      monthLabel: formatLedgerMonthYear(monthKey, language),
      entries: entriesInMonth,
      defaultExpanded,
    };
  });
}
