import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatDate } from '../../lib/format';
import type { LedgerEntry, LedgerRowStatus } from '../../lib/display/ledgerDisplay';
import {
  formatLedgerAllocationLabel,
  formatLedgerAmount,
  formatLedgerBreakdownLine,
  formatLedgerRowDescription,
} from '../../lib/display/ledgerAllocationLabels';
import {
  enrichLedgerEntriesForDisplay,
  groupLedgerEntriesByMonth,
  mapLateFeeEngineLines,
  type LedgerMonthGroup,
} from '../../lib/display/ledgerEnrichment';
import type { LateFeeEngineLine } from '../../lib/finance/lateFeeEngineV3';
import { roundLKR } from '../../lib/finance/money';
import { useT } from '../../i18n/I18nProvider';

interface LedgerTableProps {
  entries: LedgerEntry[];
  emptyMessage?: string;
  asOfDate?: string;
  lateFeeEngineLines?: LateFeeEngineLine[];
}

const thBase =
  'sticky top-0 z-10 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-700 bg-amber-50/95 border-b border-amber-200/80 first:pl-4 last:pr-4 sm:px-4 sm:first:pl-5 sm:last:pr-5';
const tdBase =
  'px-3 py-2 align-middle text-sm first:pl-4 last:pr-4 sm:px-4 sm:first:pl-5 sm:last:pr-5 [font-variant-numeric:tabular-nums]';

function formatDrCr(value: number | null): string {
  if (value == null) return '—';
  return formatLedgerAmount(value);
}

function formatBalance(value: number): string {
  if (value < 0) {
    return `-${formatLedgerAmount(Math.abs(value))}`;
  }
  return formatLedgerAmount(value);
}

function rowBackgroundClass(entryType: LedgerEntry['entryType']): string {
  switch (entryType) {
    case 'PAYMENT':
      return 'bg-success-50/70';
    case 'LATE_FEE':
      return 'bg-orange-50/80';
    case 'INSTALLMENT':
    case 'INTEREST':
    default:
      return 'bg-white';
  }
}

function showsInstallmentStatus(row: LedgerEntry): boolean {
  if (row.entryType === 'INSTALLMENT' || row.entryType === 'INTEREST') {
    return true;
  }
  return row.entryType === 'LATE_FEE' && row.lateFeeSettled === true;
}

function rowExpandKey(row: LedgerEntry, index: number): string {
  return `${row.date}-${row.entryType}-${row.sortOrder}-${row.ref ?? ''}-${index}`;
}

function hasPaymentBreakdown(row: LedgerEntry): boolean {
  return (
    row.entryType === 'PAYMENT' &&
    ((row.allocationLines != null && row.allocationLines.length > 0) ||
      (row.paymentDiscountAmount ?? 0) > 0)
  );
}

function hasLateFeeBreakdown(row: LedgerEntry): boolean {
  return (
    row.entryType === 'LATE_FEE' &&
    row.lateFeeCycleLines != null &&
    row.lateFeeCycleLines.length > 0
  );
}

export function LedgerTable({
  entries,
  emptyMessage,
  asOfDate,
  lateFeeEngineLines,
}: LedgerTableProps) {
  const { t, tf, language } = useT();
  const empty = emptyMessage ?? t('ledgerEmpty');

  const lateFeeByInstallment = useMemo(
    () =>
      lateFeeEngineLines
        ? mapLateFeeEngineLines(lateFeeEngineLines)
        : undefined,
    [lateFeeEngineLines]
  );

  const displayEntries = useMemo(
    () =>
      enrichLedgerEntriesForDisplay(
        entries,
        asOfDate ?? new Date().toISOString().slice(0, 10),
        lateFeeByInstallment,
        language,
        { tf }
      ),
    [entries, asOfDate, lateFeeByInstallment, language, tf]
  );

  const monthGroups = useMemo(
    () =>
      groupLedgerEntriesByMonth(
        displayEntries,
        asOfDate ?? new Date().toISOString().slice(0, 10),
        language
      ),
    [displayEntries, asOfDate, language]
  );

  const [expandedMonths, setExpandedMonths] = useState<Set<string> | null>(
    null
  );
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set());

  const effectiveExpandedMonths = useMemo(() => {
    if (expandedMonths != null) return expandedMonths;
    return new Set(
      monthGroups.filter((g) => g.defaultExpanded).map((g) => g.monthKey)
    );
  }, [expandedMonths, monthGroups]);

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths((prev) => {
      const base =
        prev ??
        new Set(
          monthGroups.filter((g) => g.defaultExpanded).map((g) => g.monthKey)
        );
      const next = new Set(base);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  };

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (entries.length === 0) {
    return (
      <p className="text-sm text-neutral-500 py-8 text-center bg-amber-50/40 rounded-lg border border-amber-200/60">
        {empty}
      </p>
    );
  }

  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-amber-200/80 bg-amber-50/30 shadow-sm">
        <table className="min-w-[40rem] w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className={`${thBase} text-left w-[6.5rem]`}>
                {t('ledgerColDate')}
              </th>
              <th className={`${thBase} text-left w-[5.5rem]`}>
                {t('ledgerColRef')}
              </th>
              <th className={`${thBase} text-left min-w-[10rem]`}>
                {t('ledgerColDescription')}
              </th>
              <th className={`${thBase} text-right w-[5.5rem]`}>
                {t('ledgerColDebit')}
              </th>
              <th className={`${thBase} text-right w-[5.5rem]`}>
                {t('ledgerColCredit')}
              </th>
              <th className={`${thBase} text-right w-[6rem]`}>
                {t('ledgerColBalance')}
              </th>
              <th className={`${thBase} text-center w-[5.5rem]`}>
                {t('ledgerColStatus')}
              </th>
            </tr>
          </thead>
          <tbody>
            {monthGroups.map((group) => (
              <LedgerMonthSectionDesktop
                key={group.monthKey}
                group={group}
                expanded={effectiveExpandedMonths.has(group.monthKey)}
                onToggle={() => toggleMonth(group.monthKey)}
                expandedRows={expandedRows}
                onToggleRow={toggleRow}
                t={t}
                tf={tf}
                language={language}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="sm:hidden space-y-3">
        {monthGroups.map((group) => (
          <LedgerMonthSectionMobile
            key={group.monthKey}
            group={group}
            expanded={effectiveExpandedMonths.has(group.monthKey)}
            onToggle={() => toggleMonth(group.monthKey)}
            expandedRows={expandedRows}
            onToggleRow={toggleRow}
            t={t}
            tf={tf}
            language={language}
          />
        ))}
      </div>
    </>
  );
}

function LedgerMonthSectionDesktop({
  group,
  expanded,
  onToggle,
  expandedRows,
  onToggleRow,
  t,
  tf,
  language,
}: {
  group: LedgerMonthGroup;
  expanded: boolean;
  onToggle: () => void;
  expandedRows: Set<string>;
  onToggleRow: (key: string) => void;
  t: ReturnType<typeof useT>['t'];
  tf: ReturnType<typeof useT>['tf'];
  language: ReturnType<typeof useT>['language'];
}) {
  return (
    <>
      <tr className="bg-amber-100/70 border-y border-amber-300/60">
        <td colSpan={7} className="p-0">
          <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-neutral-800 hover:bg-amber-100/90 sm:px-5"
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-neutral-600" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-neutral-600" />
            )}
            <span className="tracking-wide">{group.monthLabel}</span>
            <span className="ml-auto text-xs font-normal text-neutral-500 tabular-nums">
              {group.entries.length}{' '}
              {group.entries.length === 1 ? 'entry' : 'entries'}
            </span>
          </button>
        </td>
      </tr>
      {expanded &&
        group.entries.map((row, index) => (
          <LedgerDesktopRows
            key={rowExpandKey(row, index)}
            rowKey={rowExpandKey(row, index)}
            row={row}
            expanded={expandedRows.has(rowExpandKey(row, index))}
            onToggle={() => onToggleRow(rowExpandKey(row, index))}
            t={t}
            tf={tf}
            language={language}
          />
        ))}
    </>
  );
}

function LedgerMonthSectionMobile({
  group,
  expanded,
  onToggle,
  expandedRows,
  onToggleRow,
  t,
  tf,
  language,
}: {
  group: LedgerMonthGroup;
  expanded: boolean;
  onToggle: () => void;
  expandedRows: Set<string>;
  onToggleRow: (key: string) => void;
  t: ReturnType<typeof useT>['t'];
  tf: ReturnType<typeof useT>['tf'];
  language: ReturnType<typeof useT>['language'];
}) {
  return (
    <section className="rounded-lg border border-amber-200/80 overflow-hidden bg-amber-50/20">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-neutral-800 bg-amber-100/70 border-b border-amber-200/70"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-neutral-600" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-neutral-600" />
        )}
        <span>{group.monthLabel}</span>
      </button>
      {expanded && (
        <div className="p-2 space-y-2">
          {group.entries.map((row, index) => (
            <LedgerMobileCard
              key={rowExpandKey(row, index)}
              rowKey={rowExpandKey(row, index)}
              row={row}
              expanded={expandedRows.has(rowExpandKey(row, index))}
              onToggle={() => onToggleRow(rowExpandKey(row, index))}
              t={t}
              tf={tf}
              language={language}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function LedgerDesktopRows({
  row,
  rowKey,
  expanded,
  onToggle,
  t,
  tf,
  language,
}: {
  row: LedgerEntry;
  rowKey: string;
  expanded: boolean;
  onToggle: () => void;
  t: ReturnType<typeof useT>['t'];
  tf: ReturnType<typeof useT>['tf'];
  language: ReturnType<typeof useT>['language'];
}) {
  const description = formatLedgerRowDescription(row, t, tf, language);
  const bg = rowBackgroundClass(row.entryType);
  const paymentBreakdown = hasPaymentBreakdown(row);
  const lateFeeBreakdown = hasLateFeeBreakdown(row);
  const expandable = paymentBreakdown || lateFeeBreakdown;
  const showStatus = showsInstallmentStatus(row);

  return (
    <>
      <tr className={`border-b border-amber-100/90 ${bg}`}>
        <td className={`${tdBase} text-left text-neutral-800 whitespace-nowrap`}>
          {formatDate(row.date)}
        </td>
        <td className={`${tdBase} text-left text-neutral-600 font-mono text-xs`}>
          {row.ref ?? '—'}
        </td>
        <td className={`${tdBase} text-left font-medium text-neutral-900`}>
          <div className="flex items-start gap-1.5 min-w-0">
            {expandable ? (
              <button
                type="button"
                onClick={onToggle}
                className="mt-0.5 shrink-0 text-neutral-500 hover:text-neutral-800"
                aria-expanded={expanded}
                aria-label={
                  expanded ? t('ledgerCollapseDetails') : t('ledgerExpandDetails')
                }
              >
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="w-3.5 shrink-0" aria-hidden />
            )}
            <div className="min-w-0">
              <span className="block">{description}</span>
              {row.inGracePeriod && row.lateFeeStartDate && (
                <p className="mt-0.5 text-[11px] font-normal text-amber-800">
                  {tf('ledgerGraceLateFeeStarts', {
                    date: formatDate(row.lateFeeStartDate),
                  })}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className={`${tdBase} text-right text-neutral-800`}>
          {formatDrCr(row.debit)}
        </td>
        <td className={`${tdBase} text-right font-medium text-neutral-900`}>
          {formatDrCr(row.credit)}
        </td>
        <td className={`${tdBase} text-right font-semibold text-neutral-900`}>
          {formatBalance(row.balance)}
        </td>
        <td className={`${tdBase} text-center`}>
          <LedgerStatusCell row={row} showStatus={showStatus} t={t} />
        </td>
      </tr>
      {expanded && paymentBreakdown && (
        <tr className={`border-b border-amber-100/90 ${bg}`}>
          <td colSpan={7} className="px-4 pb-2.5 pt-0 sm:px-5 sm:pb-3">
            <LedgerPaymentBreakdown
              lines={row.allocationLines!}
              cashReceived={row.paymentCashReceived}
              discountAmount={row.paymentDiscountAmount}
              appliedLabel={t('ledgerAppliedTo')}
              t={t}
              language={language}
            />
          </td>
        </tr>
      )}
      {expanded && lateFeeBreakdown && (
        <tr className={`border-b border-amber-100/90 ${bg}`}>
          <td colSpan={7} className="px-4 pb-2.5 pt-0 sm:px-5 sm:pb-3">
            <LedgerLateFeeBreakdown
              lines={row.lateFeeCycleLines!}
              total={row.debit ?? 0}
              totalLabel={t('ledgerLateFeeTotal')}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function LedgerMobileCard({
  row,
  rowKey,
  expanded,
  onToggle,
  t,
  tf,
  language,
}: {
  row: LedgerEntry;
  rowKey: string;
  expanded: boolean;
  onToggle: () => void;
  t: ReturnType<typeof useT>['t'];
  tf: ReturnType<typeof useT>['tf'];
  language: ReturnType<typeof useT>['language'];
}) {
  const description = formatLedgerRowDescription(row, t, tf, language);
  const bg = rowBackgroundClass(row.entryType);
  const paymentBreakdown = hasPaymentBreakdown(row);
  const lateFeeBreakdown = hasLateFeeBreakdown(row);
  const expandable = paymentBreakdown || lateFeeBreakdown;
  const showStatus = showsInstallmentStatus(row);

  return (
    <article
      className={`rounded-lg border border-amber-200/70 px-3 py-2.5 ${bg}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            {expandable && (
              <button
                type="button"
                onClick={onToggle}
                className="mt-0.5 shrink-0 text-neutral-500"
                aria-expanded={expanded}
              >
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            <div className="min-w-0">
              <p className="text-xs text-neutral-600">{formatDate(row.date)}</p>
              <p className="font-medium text-neutral-900 leading-snug">
                {description}
              </p>
              {row.inGracePeriod && row.lateFeeStartDate && (
                <p className="text-[11px] text-amber-800 mt-0.5">
                  {tf('ledgerGraceLateFeeStarts', {
                    date: formatDate(row.lateFeeStartDate),
                  })}
                </p>
              )}
              {row.ref && (
                <p className="font-mono text-xs text-neutral-500 mt-0.5">
                  {row.ref}
                </p>
              )}
            </div>
          </div>
        </div>
        <LedgerStatusCell row={row} showStatus={showStatus} t={t} />
      </div>
      <dl className="grid grid-cols-3 gap-x-2 gap-y-1 text-xs">
        <div>
          <dt className="text-neutral-500">{t('ledgerColDebit')}</dt>
          <dd className="font-medium text-neutral-900 tabular-nums">
            {formatDrCr(row.debit)}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">{t('ledgerColCredit')}</dt>
          <dd className="font-medium text-neutral-900 tabular-nums">
            {formatDrCr(row.credit)}
          </dd>
        </div>
        <div className="text-right">
          <dt className="text-neutral-500">{t('ledgerColBalance')}</dt>
          <dd className="font-semibold text-neutral-900 tabular-nums">
            {formatBalance(row.balance)}
          </dd>
        </div>
      </dl>
      {expanded && paymentBreakdown && (
        <div className="mt-2 pt-2 border-t border-amber-200/50">
          <LedgerPaymentBreakdown
            lines={row.allocationLines!}
            cashReceived={row.paymentCashReceived}
            discountAmount={row.paymentDiscountAmount}
            appliedLabel={t('ledgerAppliedTo')}
            t={t}
            language={language}
          />
        </div>
      )}
      {expanded && lateFeeBreakdown && (
        <div className="mt-2 pt-2 border-t border-amber-200/50">
          <LedgerLateFeeBreakdown
            lines={row.lateFeeCycleLines!}
            total={row.debit ?? 0}
            totalLabel={t('ledgerLateFeeTotal')}
          />
        </div>
      )}
    </article>
  );
}

function LedgerStatusCell({
  row,
  showStatus,
  t,
}: {
  row: LedgerEntry;
  showStatus: boolean;
  t: ReturnType<typeof useT>['t'];
}) {
  const badges: React.ReactNode[] = [];

  if (row.inGracePeriod) {
    badges.push(<GracePeriodBadge key="grace" t={t} />);
  }

  if (
    row.lateFeeSettled &&
    (row.entryType === 'LATE_FEE' || row.entryType === 'INSTALLMENT')
  ) {
    badges.push(<LateFeeSettledBadge key="lf-settled" t={t} />);
  }

  if (showStatus) {
    badges.push(
      <LedgerRowStatusBadge key="status" status={row.status} t={t} />
    );
  }

  if (badges.length === 0) {
    return <span className="text-neutral-300">—</span>;
  }

  return (
    <div className="flex flex-col items-center gap-1">{badges}</div>
  );
}

function GracePeriodBadge({ t }: { t: ReturnType<typeof useT>['t'] }) {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 bg-amber-200/90 ring-1 ring-inset ring-amber-400/50">
      {t('ledgerGracePeriod')}
    </span>
  );
}

function LateFeeSettledBadge({ t }: { t: ReturnType<typeof useT>['t'] }) {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success-800 bg-success-100/90 ring-1 ring-inset ring-success-300/60">
      {t('ledgerBadgeLateFeeSettled')}
    </span>
  );
}

function LedgerPaymentBreakdown({
  lines,
  cashReceived,
  discountAmount,
  appliedLabel,
  t,
  language,
}: {
  lines: NonNullable<LedgerEntry['allocationLines']>;
  cashReceived?: number;
  discountAmount?: number;
  appliedLabel: string;
  t: ReturnType<typeof useT>['t'];
  language: ReturnType<typeof useT>['language'];
}) {
  const cash = cashReceived ?? 0;
  const discount = discountAmount ?? 0;
  const settled = roundLKR(cash + discount);

  return (
    <div className="ml-0 sm:ml-8 text-xs text-neutral-700 max-w-lg border-l-2 border-amber-300/50 pl-3">
      {(cash > 0 || discount > 0) && (
        <ul className="space-y-0.5 font-mono mb-2">
          {cash > 0 && (
            <LedgerBreakdownSummaryLine
              label={t('ledgerDescPaymentReceived')}
              amount={cash}
            />
          )}
          {discount > 0 && (
            <LedgerBreakdownSummaryLine
              label={t('ledgerPaymentDiscountApproved')}
              amount={discount}
            />
          )}
          {discount > 0 && settled > 0 && (
            <LedgerBreakdownSummaryLine
              label={t('ledgerInstallmentSettled')}
              amount={settled}
              bold
            />
          )}
        </ul>
      )}
      <p className="font-medium text-neutral-800 mb-1">{appliedLabel}:</p>
      <ul className="space-y-0.5 font-mono">
        {lines.map((line) => {
          const label = formatLedgerAllocationLabel(
            line.allocationType,
            line.dueDate,
            t,
            language
          );
          const { dots, amount } = formatLedgerBreakdownLine(label, line.amount);
          return (
            <li key={line.key} className="flex gap-1 min-w-0">
              <span className="shrink-0 text-neutral-500" aria-hidden>
                •
              </span>
              <span className="truncate text-neutral-800">{label}</span>
              <span className="shrink-0 text-neutral-400 hidden sm:inline">
                {dots}
              </span>
              <span className="shrink-0 ml-auto sm:ml-0 font-semibold text-neutral-900 tabular-nums">
                {amount}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LedgerLateFeeBreakdown({
  lines,
  total,
  totalLabel,
}: {
  lines: NonNullable<LedgerEntry['lateFeeCycleLines']>;
  total: number;
  totalLabel: string;
}) {
  return (
    <div className="ml-0 sm:ml-8 text-xs text-neutral-700 max-w-lg border-l-2 border-orange-300/50 pl-3">
      <ul className="space-y-0.5 font-mono">
        {lines.map((line) => {
          const { dots, amount } = formatLedgerBreakdownLine(line.label, line.amount);
          return (
            <li key={line.key} className="flex gap-1 min-w-0">
              <span className="shrink-0 text-neutral-500" aria-hidden>
                •
              </span>
              <span className="truncate text-neutral-800">{line.label}</span>
              <span className="shrink-0 text-neutral-400 hidden sm:inline">
                {dots}
              </span>
              <span className="shrink-0 ml-auto sm:ml-0 font-semibold text-neutral-900 tabular-nums">
                {amount}
              </span>
            </li>
          );
        })}
        <li className="flex gap-1 min-w-0 pt-1 border-t border-orange-200/60 mt-1">
          <span className="shrink-0 text-neutral-500" aria-hidden>
            •
          </span>
          <span className="font-semibold text-neutral-900">{totalLabel}</span>
          <span className="shrink-0 ml-auto font-bold text-neutral-900 tabular-nums">
            {formatLedgerAmount(total)}
          </span>
        </li>
      </ul>
    </div>
  );
}

function LedgerBreakdownSummaryLine({
  label,
  amount,
  bold,
}: {
  label: string;
  amount: number;
  bold?: boolean;
}) {
  const { dots, amount: amountStr } = formatLedgerBreakdownLine(label, amount);
  return (
    <li className="flex gap-1 min-w-0">
      <span className="shrink-0 text-neutral-500" aria-hidden>
        •
      </span>
      <span
        className={`truncate ${bold ? 'font-semibold text-neutral-900' : 'text-neutral-800'}`}
      >
        {label}
      </span>
      <span className="shrink-0 text-neutral-400 hidden sm:inline">{dots}</span>
      <span
        className={`shrink-0 ml-auto sm:ml-0 tabular-nums ${
          bold ? 'font-bold text-neutral-900' : 'font-semibold text-neutral-900'
        }`}
      >
        {amountStr}
      </span>
    </li>
  );
}

function LedgerRowStatusBadge({
  status,
  t,
}: {
  status: LedgerRowStatus;
  t: ReturnType<typeof useT>['t'];
}) {
  const config: Record<
    LedgerRowStatus,
    {
      labelKey: 'ledgerStatusPaid' | 'ledgerStatusPartial' | 'ledgerStatusOverdue';
      className: string;
    }
  > = {
    PAID: {
      labelKey: 'ledgerStatusPaid',
      className: 'text-success-800 bg-success-100/90 ring-success-300/60',
    },
    PARTIAL: {
      labelKey: 'ledgerStatusPartial',
      className: 'text-amber-900 bg-amber-100/90 ring-amber-300/60',
    },
    OVERDUE: {
      labelKey: 'ledgerStatusOverdue',
      className: 'text-danger-800 bg-danger-100/90 ring-danger-300/60',
    },
  };
  const { labelKey, className } = config[status];
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${className}`}
    >
      {t(labelKey)}
    </span>
  );
}
