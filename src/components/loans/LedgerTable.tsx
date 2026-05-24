import React from 'react';
import { formatDate } from '../../lib/format';
import type { LedgerEntry, LedgerRowStatus } from '../../lib/display/ledgerDisplay';
import {
  formatLedgerAllocationLabel,
  formatLedgerAmount,
  formatLedgerBreakdownLine,
  formatLedgerRowDescription,
} from '../../lib/display/ledgerAllocationLabels';
import { roundLKR } from '../../lib/finance/money';
import { useT } from '../../i18n/I18nProvider';

interface LedgerTableProps {
  entries: LedgerEntry[];
  emptyMessage?: string;
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

function showsInstallmentStatus(entryType: LedgerEntry['entryType']): boolean {
  return entryType === 'INSTALLMENT' || entryType === 'INTEREST';
}

export function LedgerTable({ entries, emptyMessage }: LedgerTableProps) {
  const { t, tf, language } = useT();
  const empty = emptyMessage ?? t('ledgerEmpty');

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
            {entries.map((row, index) => (
              <LedgerDesktopRows
                key={`${row.date}-${row.entryType}-${row.sortOrder}-${index}`}
                row={row}
                t={t}
                tf={tf}
                language={language}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="sm:hidden space-y-2">
        {entries.map((row, index) => (
          <LedgerMobileCard
            key={`m-${row.date}-${row.entryType}-${row.sortOrder}-${index}`}
            row={row}
            t={t}
            tf={tf}
            language={language}
          />
        ))}
      </div>
    </>
  );
}

function LedgerDesktopRows({
  row,
  t,
  tf,
  language,
}: {
  row: LedgerEntry;
  t: ReturnType<typeof useT>['t'];
  tf: ReturnType<typeof useT>['tf'];
  language: ReturnType<typeof useT>['language'];
}) {
  const description = formatLedgerRowDescription(row, t, tf, language);
  const bg = rowBackgroundClass(row.entryType);
  const hasBreakdown =
    row.entryType === 'PAYMENT' &&
    ((row.allocationLines != null && row.allocationLines.length > 0) ||
      (row.paymentDiscountAmount ?? 0) > 0);
  const showStatus = showsInstallmentStatus(row.entryType);

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
          {description}
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
          {showStatus ? (
            <LedgerRowStatusBadge status={row.status} t={t} />
          ) : (
            <span className="text-neutral-300">—</span>
          )}
        </td>
      </tr>
      {hasBreakdown && (
        <tr className={`border-b border-amber-100/90 ${bg}`}>
          <td colSpan={7} className="px-4 pb-2.5 pt-0 sm:px-5 sm:pb-3">
            <LedgerPaymentBreakdown
              lines={row.allocationLines!}
              cashReceived={row.paymentCashReceived}
              discountAmount={row.paymentDiscountAmount}
              appliedLabel={t('ledgerAllocationApplied')}
              t={t}
              language={language}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function LedgerMobileCard({
  row,
  t,
  tf,
  language,
}: {
  row: LedgerEntry;
  t: ReturnType<typeof useT>['t'];
  tf: ReturnType<typeof useT>['tf'];
  language: ReturnType<typeof useT>['language'];
}) {
  const description = formatLedgerRowDescription(row, t, tf, language);
  const bg = rowBackgroundClass(row.entryType);
  const hasBreakdown =
    row.entryType === 'PAYMENT' &&
    ((row.allocationLines != null && row.allocationLines.length > 0) ||
      (row.paymentDiscountAmount ?? 0) > 0);
  const showStatus = showsInstallmentStatus(row.entryType);

  return (
    <article
      className={`rounded-lg border border-amber-200/70 px-3 py-2.5 ${bg}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <p className="text-xs text-neutral-600">{formatDate(row.date)}</p>
          <p className="font-medium text-neutral-900 leading-snug">
            {description}
          </p>
          {row.ref && (
            <p className="font-mono text-xs text-neutral-500 mt-0.5">
              {row.ref}
            </p>
          )}
        </div>
        {showStatus && (
          <LedgerRowStatusBadge status={row.status} t={t} />
        )}
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
      {hasBreakdown && (
        <div className="mt-2 pt-2 border-t border-amber-200/50">
          <LedgerPaymentBreakdown
            lines={row.allocationLines!}
            cashReceived={row.paymentCashReceived}
            discountAmount={row.paymentDiscountAmount}
            appliedLabel={t('ledgerAllocationApplied')}
            t={t}
            language={language}
          />
        </div>
      )}
    </article>
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
    <div className="ml-0 sm:ml-8 text-xs text-neutral-700 max-w-lg">
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
      <span className={`truncate ${bold ? 'font-semibold text-neutral-900' : 'text-neutral-800'}`}>
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
