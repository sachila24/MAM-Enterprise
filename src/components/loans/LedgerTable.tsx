import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { formatDate, formatLKR } from '../../lib/format';
import type { LedgerEntry, LedgerRowStatus } from '../../lib/display/ledgerDisplay';
import {
  allocationLineColorClass,
  formatLedgerAllocationLabel,
} from '../../lib/display/ledgerAllocationLabels';
import { useT } from '../../i18n/I18nProvider';

interface LedgerTableProps {
  entries: LedgerEntry[];
  emptyMessage?: string;
  /** Current loan principal remaining — shown in expanded payment detail only. */
  loanBalanceRemaining?: number;
}

const thBase =
  'px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600 first:pl-4 last:pr-4 sm:px-4 sm:first:pl-5 sm:last:pr-5';
const tdBase =
  'px-3 py-2.5 align-middle text-sm first:pl-4 last:pr-4 sm:px-4 sm:py-3 sm:first:pl-5 sm:last:pr-5 [font-variant-numeric:tabular-nums]';

function formatDrCr(value: number | null): string {
  if (value == null) return '—';
  return formatLKR(value);
}

export function LedgerTable({
  entries,
  emptyMessage,
  loanBalanceRemaining,
}: LedgerTableProps) {
  const { t, language } = useT();
  const empty = emptyMessage ?? t('ledgerEmpty');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());

  if (entries.length === 0) {
    return (
      <p className="text-sm text-neutral-500 py-8 text-center bg-white rounded-xl ring-1 ring-neutral-200">
        {empty}
      </p>
    );
  }

  const toggleExpanded = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-neutral-200">
      <table className="min-w-[44rem] w-full text-sm border-collapse">
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th className={`${thBase} text-left w-24`}>{t('ledgerColDate')}</th>
            <th className={`${thBase} text-left w-24 hidden sm:table-cell`}>
              {t('ledgerColRef')}
            </th>
            <th className={`${thBase} text-left min-w-[10rem]`}>
              {t('ledgerColDescription')}
            </th>
            <th className={`${thBase} text-right w-24`}>{t('ledgerColDebit')}</th>
            <th className={`${thBase} text-right w-24`}>{t('ledgerColCredit')}</th>
            <th className={`${thBase} text-right w-28`}>
              {t('ledgerColRunningBalance')}
            </th>
            <th className={`${thBase} text-center w-24 hidden md:table-cell`}>
              {t('ledgerColStatus')}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((row, index) => {
            const rowKey = `${row.date}-${row.entryType}-${row.sortOrder}-${index}`;
            const hasAllocation =
              row.entryType === 'PAYMENT' &&
              row.allocationLines != null &&
              row.allocationLines.length > 0;
            const expanded = expandedKeys.has(rowKey);

            return (
              <React.Fragment key={rowKey}>
                <tr
                  className={`border-b border-neutral-100 ${
                    index % 2 === 1 ? 'bg-neutral-50/80' : 'bg-white'
                  } ${hasAllocation ? 'cursor-pointer hover:bg-neutral-50' : ''}`}
                  onClick={
                    hasAllocation ? () => toggleExpanded(rowKey) : undefined
                  }
                >
                  <td className={`${tdBase} text-left text-neutral-700 whitespace-nowrap`}>
                    {formatDate(row.date)}
                  </td>
                  <td
                    className={`${tdBase} text-left text-neutral-600 font-mono text-xs hidden sm:table-cell`}
                  >
                    {row.ref ?? '—'}
                  </td>
                  <td className={`${tdBase} text-left`}>
                    <LedgerDescriptionCell
                      row={row}
                      hasAllocation={hasAllocation}
                      expanded={expanded}
                      onToggle={
                        hasAllocation
                          ? (e) => {
                              e.stopPropagation();
                              toggleExpanded(rowKey);
                            }
                          : undefined
                      }
                      appliedLabel={t('ledgerAllocationApplied')}
                      t={t}
                    />
                  </td>
                  <td className={`${tdBase} text-right text-neutral-800`}>
                    {formatDrCr(row.debit)}
                  </td>
                  <td className={`${tdBase} text-right font-medium text-neutral-900`}>
                    {formatDrCr(row.credit)}
                  </td>
                  <td className={`${tdBase} text-right font-semibold text-neutral-900`}>
                    {formatLKR(row.balance)}
                  </td>
                  <td className={`${tdBase} text-center hidden md:table-cell`}>
                    <LedgerRowStatusBadge status={row.status} t={t} />
                  </td>
                </tr>
                {hasAllocation && expanded && (
                  <tr
                    className={`border-b border-neutral-100 ${
                      index % 2 === 1 ? 'bg-neutral-50/80' : 'bg-white'
                    }`}
                  >
                    <td colSpan={7} className="px-4 pb-3 pt-0 sm:px-5">
                      <LedgerAllocationDetail
                        lines={row.allocationLines!}
                        appliedLabel={t('ledgerAllocationApplied')}
                        loanBalanceRemaining={loanBalanceRemaining}
                        loanBalanceLabel={t('ledgerLoanBalanceRemaining')}
                        t={t}
                        language={language}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LedgerDescriptionCell({
  row,
  hasAllocation,
  expanded,
  onToggle,
  appliedLabel,
  t,
}: {
  row: LedgerEntry;
  hasAllocation: boolean;
  expanded: boolean;
  onToggle?: (e: React.MouseEvent) => void;
  appliedLabel: string;
  t: ReturnType<typeof useT>['t'];
}) {
  return (
    <div className="flex items-start gap-1.5 min-w-0">
      {hasAllocation && onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-0.5 shrink-0 text-neutral-400 hover:text-neutral-700"
          aria-expanded={expanded}
          aria-label={appliedLabel}
        >
          {expanded ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </button>
      )}
      <div className="min-w-0">
        <p className="font-medium text-neutral-900 truncate">{row.description}</p>
        {row.ref && (
          <p className="sm:hidden font-mono text-xs text-neutral-500 mt-0.5">
            {row.ref}
          </p>
        )}
        {hasAllocation && !expanded && (
          <p className="text-xs text-neutral-500 mt-0.5">{appliedLabel}</p>
        )}
        <div className="mt-1 md:hidden">
          <LedgerRowStatusBadge status={row.status} t={t} />
        </div>
      </div>
    </div>
  );
}

function LedgerAllocationDetail({
  lines,
  appliedLabel,
  loanBalanceRemaining,
  loanBalanceLabel,
  t,
  language,
}: {
  lines: NonNullable<LedgerEntry['allocationLines']>;
  appliedLabel: string;
  loanBalanceRemaining?: number;
  loanBalanceLabel: string;
  t: ReturnType<typeof useT>['t'];
  language: ReturnType<typeof useT>['language'];
}) {
  return (
    <div className="ml-5 sm:ml-6 rounded-md bg-neutral-100/80 px-3 py-2 text-xs text-neutral-700 ring-1 ring-neutral-200/80 max-w-md">
      <p className="font-semibold text-neutral-800 mb-1.5">{appliedLabel}</p>
      <ul className="space-y-1">
        {lines.map((line) => (
          <li
            key={line.key}
            className="flex justify-between gap-3 sm:gap-6"
          >
            <span
              className={`min-w-0 truncate ${allocationLineColorClass(line.allocationType)}`}
            >
              {formatLedgerAllocationLabel(
                line.allocationType,
                line.dueDate,
                t,
                language
              )}
            </span>
            <span className="shrink-0 font-medium tabular-nums text-neutral-900">
              {formatLKR(line.amount)}
            </span>
          </li>
        ))}
      </ul>
      {loanBalanceRemaining != null && loanBalanceRemaining >= 0 && (
        <p className="mt-2 pt-2 border-t border-neutral-200/80 text-neutral-500">
          {loanBalanceLabel}:{' '}
          <span className="font-medium text-neutral-700 tabular-nums">
            {formatLKR(loanBalanceRemaining)}
          </span>
        </p>
      )}
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
      emoji: string;
      labelKey: 'ledgerStatusPaid' | 'ledgerStatusPartial' | 'ledgerStatusOverdue';
      className: string;
    }
  > = {
    PAID: {
      emoji: '🟢',
      labelKey: 'ledgerStatusPaid',
      className: 'text-success-800 bg-success-50 ring-success-200',
    },
    PARTIAL: {
      emoji: '🟡',
      labelKey: 'ledgerStatusPartial',
      className: 'text-warning-800 bg-warning-50 ring-warning-200',
    },
    OVERDUE: {
      emoji: '🔴',
      labelKey: 'ledgerStatusOverdue',
      className: 'text-danger-800 bg-danger-50 ring-danger-200',
    },
  };
  const { emoji, labelKey, className } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      <span aria-hidden>{emoji}</span>
      {t(labelKey)}
    </span>
  );
}
