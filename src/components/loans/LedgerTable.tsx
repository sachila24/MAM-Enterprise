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
import { useT } from '../../i18n/I18nProvider';

interface LedgerTableProps {
  entries: LedgerEntry[];
  emptyMessage?: string;
  asOfDate?: string;
  lateFeeEngineLines?: LateFeeEngineLine[];
}

const thBase =
  'sticky top-0 z-10 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-700 bg-amber-50/95 border-b border-amber-200/80 first:pl-3 last:pr-3 sm:px-3 sm:first:pl-4 sm:last:pr-4';
const tdBase =
  'px-2 py-1 align-middle text-xs leading-tight first:pl-3 last:pr-3 sm:px-3 sm:first:pl-4 sm:last:pr-4 [font-variant-numeric:tabular-nums]';
const breakdownBlockClass =
  'mt-1.5 w-full max-w-[20rem] pl-3 border-l border-amber-200/60 text-[11px] leading-4 font-mono text-neutral-600';
const breakdownLateFeeBlockClass =
  'mt-1.5 w-full max-w-[20rem] pl-3 border-l border-orange-200/55 text-[11px] leading-4 font-mono text-neutral-600';
const breakdownListClass = 'space-y-0.5';
const breakdownHeaderClass =
  'text-[11px] font-medium text-neutral-700 leading-4 mb-1';

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

function formatLoanTotalBalance(value: number | undefined): string {
  if (value == null) return '—';
  return formatBalance(value);
}

function rowBackgroundClass(entryType: LedgerEntry['entryType']): string {
  switch (entryType) {
    case 'PAYMENT':
      return 'bg-success-50/70';
    case 'LATE_FEE':
      return 'bg-orange-50/80';
    case 'LOAN_OPENING':
      return 'bg-amber-50/50';
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

function allocationEntryCount(row: LedgerEntry): number {
  return row.allocationLines?.length ?? 0;
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
        <table className="min-w-[52rem] w-full text-xs border-collapse">
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
              <th className={`${thBase} text-right w-[6.5rem]`}>
                {t('ledgerColBalance')}
              </th>
              <th className={`${thBase} text-right w-[6.5rem]`}>
                {t('ledgerColLoanTotalBalance')}
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
        <td colSpan={8} className="p-0">
          <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs font-semibold text-neutral-800 hover:bg-amber-100/90 sm:px-4"
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
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-xs font-semibold text-neutral-800 bg-amber-100/70 border-b border-amber-200/70"
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
        <div className="p-1.5 space-y-1">
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
    <tr className={`border-b border-amber-100/90 ${bg}`}>
        <td className={`${tdBase} text-left text-neutral-800 whitespace-nowrap`}>
          {formatDate(row.date)}
        </td>
        <td className={`${tdBase} text-left text-neutral-600 font-mono text-[10px]`}>
          {row.ref ?? '—'}
        </td>
        <td className={`${tdBase} text-left font-medium text-neutral-900`}>
          <LedgerDescriptionCell
            row={row}
            description={description}
            paymentBreakdown={paymentBreakdown}
            lateFeeBreakdown={lateFeeBreakdown}
            expandable={expandable}
            expanded={expanded}
            onToggle={onToggle}
            t={t}
            tf={tf}
            language={language}
          />
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
        <td className={`${tdBase} text-right font-semibold text-neutral-800`}>
          {formatLoanTotalBalance(row.loanTotalBalance)}
        </td>
        <td className={`${tdBase} text-center`}>
          <LedgerStatusCell row={row} showStatus={showStatus} t={t} />
        </td>
    </tr>
  );
}

function LedgerDescriptionCell({
  row,
  description,
  paymentBreakdown,
  lateFeeBreakdown,
  expandable,
  expanded,
  onToggle,
  t,
  tf,
  language,
}: {
  row: LedgerEntry;
  description: string;
  paymentBreakdown: boolean;
  lateFeeBreakdown: boolean;
  expandable: boolean;
  expanded: boolean;
  onToggle: () => void;
  t: ReturnType<typeof useT>['t'];
  tf: ReturnType<typeof useT>['tf'];
  language: ReturnType<typeof useT>['language'];
}) {
  const paymentCollapsed = paymentBreakdown && !expanded;
  const paymentAmount = row.credit ?? row.paymentCashReceived ?? 0;

  return (
    <div className="flex items-start gap-1 min-w-0">
      {expandable ? (
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 text-neutral-500 hover:text-neutral-800 leading-none pt-px"
          aria-expanded={expanded}
          aria-label={
            expanded ? t('ledgerCollapseDetails') : t('ledgerExpandDetails')
          }
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
      ) : (
        <span className="w-3 shrink-0" aria-hidden />
      )}
      <div className="min-w-0 flex-1 leading-tight">
        {paymentCollapsed ? (
          <>
            <PaymentAmountLine
              label={t('ledgerDescPaymentReceived')}
              amount={paymentAmount}
            />
            {allocationEntryCount(row) > 0 && (
              <p className="text-[10px] text-neutral-500 mt-px">
                {tf('ledgerAppliedEntryCount', {
                  count: allocationEntryCount(row),
                })}
              </p>
            )}
          </>
        ) : (
          <>
            <span className="block">{description}</span>
            {row.inGracePeriod && row.lateFeeStartDate && (
              <p className="text-[10px] font-normal text-amber-800 mt-px">
                {tf('ledgerGraceLateFeeStarts', {
                  date: formatDate(row.lateFeeStartDate),
                })}
              </p>
            )}
          </>
        )}
        {expanded && paymentBreakdown && (
          <LedgerPaymentBreakdownVertical
            lines={row.allocationLines ?? []}
            discountAmount={row.paymentDiscountAmount}
            appliedLabel={t('ledgerAppliedTo')}
            t={t}
            language={language}
          />
        )}
        {expanded && lateFeeBreakdown && (
          <LedgerLateFeeBreakdownVertical
            lines={row.lateFeeCycleLines!}
            total={row.debit ?? 0}
            cyclesLabel={t('ledgerLateFeeCycles')}
            totalLabel={t('ledgerLateFeeTotal')}
          />
        )}
      </div>
    </div>
  );
}

function PaymentAmountLine({ label, amount }: { label: string; amount: number }) {
  const { dots, amount: amountStr } = formatLedgerBreakdownLine(label, amount);
  return (
    <p className="font-mono text-[11px] text-neutral-900 truncate">
      <span>{label}</span>
      <span className="text-neutral-400">{dots}</span>
      <span className="font-semibold">{amountStr}</span>
    </p>
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
      className={`rounded border border-amber-200/70 px-2 py-1.5 ${bg}`}
    >
      <div className="flex items-start justify-between gap-1.5 mb-1">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-neutral-600 leading-none mb-0.5">
            {formatDate(row.date)}
            {row.ref ? (
              <span className="font-mono text-neutral-500 ml-1.5">{row.ref}</span>
            ) : null}
          </p>
          <LedgerDescriptionCell
            row={row}
            description={description}
            paymentBreakdown={paymentBreakdown}
            lateFeeBreakdown={lateFeeBreakdown}
            expandable={expandable}
            expanded={expanded}
            onToggle={onToggle}
            t={t}
            tf={tf}
            language={language}
          />
        </div>
        <LedgerStatusCell row={row} showStatus={showStatus} t={t} />
      </div>
      <dl className="grid grid-cols-2 gap-x-1.5 gap-y-0.5 text-[10px] leading-tight">
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
        <div>
          <dt className="text-neutral-500">{t('ledgerColBalance')}</dt>
          <dd className="font-semibold text-neutral-900 tabular-nums">
            {formatBalance(row.balance)}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">{t('ledgerColLoanTotalBalance')}</dt>
          <dd className="font-semibold text-neutral-800 tabular-nums">
            {formatLoanTotalBalance(row.loanTotalBalance)}
          </dd>
        </div>
      </dl>
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
    <div className="flex flex-row flex-wrap justify-center items-center gap-0.5 max-w-[10rem]">{badges}</div>
  );
}

function GracePeriodBadge({ t }: { t: ReturnType<typeof useT>['t'] }) {
  return (
    <span className="inline-flex items-center rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide text-amber-900 bg-amber-200/90 ring-1 ring-inset ring-amber-400/50 whitespace-nowrap">
      {t('ledgerGracePeriod')}
    </span>
  );
}

function LateFeeSettledBadge({ t }: { t: ReturnType<typeof useT>['t'] }) {
  return (
    <span className="inline-flex items-center rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide text-success-800 bg-success-100/90 ring-1 ring-inset ring-success-300/60 whitespace-nowrap">
      {t('ledgerBadgeLateFeeSettled')}
    </span>
  );
}

function LedgerVerticalBreakdownLine({
  label,
  amount,
  bold,
  totalLine,
}: {
  label: string;
  amount: number;
  bold?: boolean;
  /** Emphasize total row (late-fee cycle total). */
  totalLine?: boolean;
}) {
  const amountStr = formatLedgerAmount(amount);
  const isTotal = bold || totalLine;
  return (
    <li
      className={`flex items-baseline gap-1.5 min-w-0 py-[1px] leading-4 ${
        isTotal
          ? `pt-0.5 mt-0.5 border-t ${
              totalLine ? 'border-orange-200/65' : 'border-neutral-200/70'
            }`
          : ''
      }`}
    >
      <span className="shrink-0 text-neutral-400 select-none" aria-hidden>
        •
      </span>
      <span className="flex flex-1 min-w-0 items-baseline justify-between gap-3">
        <span
          className={`truncate pr-1 ${
            isTotal ? 'font-medium text-neutral-900' : 'text-neutral-700'
          }`}
        >
          {label}
        </span>
        <span
          className={`shrink-0 tabular-nums ${
            isTotal ? 'font-semibold text-neutral-900' : 'font-medium text-neutral-800'
          }`}
        >
          {amountStr}
        </span>
      </span>
    </li>
  );
}

function LedgerPaymentBreakdownVertical({
  lines,
  discountAmount,
  appliedLabel,
  t,
  language,
}: {
  lines: NonNullable<LedgerEntry['allocationLines']>;
  discountAmount?: number;
  appliedLabel: string;
  t: ReturnType<typeof useT>['t'];
  language: ReturnType<typeof useT>['language'];
}) {
  const discount = discountAmount ?? 0;

  return (
    <div className={breakdownBlockClass}>
      {discount > 0 && (
        <ul className={`${breakdownListClass} mb-0.5`}>
          <LedgerVerticalBreakdownLine
            label={t('ledgerAllocDiscountApproved')}
            amount={discount}
          />
        </ul>
      )}
      <p className={breakdownHeaderClass}>{appliedLabel}:</p>
      <ul className={breakdownListClass}>
        {lines.map((line) => {
          const label = formatLedgerAllocationLabel(
            line.allocationType,
            line.dueDate,
            t,
            language
          );
          return (
            <LedgerVerticalBreakdownLine
              key={line.key}
              label={label}
              amount={line.amount}
            />
          );
        })}
      </ul>
    </div>
  );
}

function LedgerLateFeeBreakdownVertical({
  lines,
  total,
  cyclesLabel,
  totalLabel,
}: {
  lines: NonNullable<LedgerEntry['lateFeeCycleLines']>;
  total: number;
  cyclesLabel: string;
  totalLabel: string;
}) {
  return (
    <div className={breakdownLateFeeBlockClass}>
      <p className={breakdownHeaderClass}>{cyclesLabel}:</p>
      <ul className={breakdownListClass}>
        {lines.map((line) => (
          <LedgerVerticalBreakdownLine
            key={line.key}
            label={line.label}
            amount={line.amount}
          />
        ))}
        <LedgerVerticalBreakdownLine
          label={totalLabel}
          amount={total}
          bold
          totalLine
        />
      </ul>
    </div>
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
      className={`inline-flex items-center rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide ring-1 ring-inset whitespace-nowrap ${className}`}
    >
      {t(labelKey)}
    </span>
  );
}
