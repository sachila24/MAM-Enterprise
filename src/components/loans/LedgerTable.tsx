import React from 'react';
import { formatDate, formatLKR } from '../../lib/format';
import type { LedgerEntry, LedgerRowStatus } from '../../lib/display/ledgerDisplay';
import { useT } from '../../i18n/I18nProvider';

interface LedgerTableProps {
  entries: LedgerEntry[];
  emptyMessage?: string;
}

const thBase =
  'px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600 first:pl-5 last:pr-5';
const tdBase =
  'px-4 py-3 align-top text-sm first:pl-5 last:pr-5 [font-variant-numeric:tabular-nums]';

function formatAmountCell(value: number | null): string {
  if (value == null) return '—';
  return formatLKR(value);
}

export function LedgerTable({ entries, emptyMessage }: LedgerTableProps) {
  const { t } = useT();
  const empty = emptyMessage ?? t('ledgerEmpty');

  if (entries.length === 0) {
    return (
      <p className="text-sm text-neutral-500 py-8 text-center bg-white rounded-xl ring-1 ring-neutral-200">
        {empty}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-neutral-200">
      <table className="min-w-full text-sm border-collapse">
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th className={`${thBase} text-left w-28`}>{t('ledgerColDate')}</th>
            <th className={`${thBase} text-left min-w-[12rem]`}>
              {t('ledgerColDescription')}
            </th>
            <th className={`${thBase} text-right w-32`}>
              {t('ledgerColInstallmentAmount')}
            </th>
            <th className={`${thBase} text-right w-28`}>{t('ledgerColLateFee')}</th>
            <th className={`${thBase} text-right w-32`}>{t('ledgerColPaymentAmount')}</th>
            <th className={`${thBase} text-center w-28`}>{t('ledgerColStatus')}</th>
            <th className={`${thBase} text-right min-w-[9rem]`}>
              {t('ledgerColOutstandingAfter')}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((row, index) => (
            <tr
              key={`${row.date}-${row.sortOrder}-${index}`}
              className={`border-b border-neutral-100 last:border-0 ${
                index % 2 === 1 ? 'bg-neutral-50/80' : 'bg-white'
              }`}
            >
              <td className={`${tdBase} text-left text-neutral-700 whitespace-nowrap`}>
                {formatDate(row.date)}
              </td>
              <td className={`${tdBase} text-left`}>
                <LedgerDescriptionCell row={row} />
              </td>
              <td className={`${tdBase} text-right text-neutral-800`}>
                {formatAmountCell(row.installmentAmount)}
              </td>
              <td className={`${tdBase} text-right text-neutral-800`}>
                {formatAmountCell(row.lateFeeAmount)}
              </td>
              <td className={`${tdBase} text-right font-medium text-neutral-900`}>
                {formatAmountCell(row.paymentAmount)}
              </td>
              <td className={`${tdBase} text-center`}>
                <LedgerRowStatusBadge status={row.status} t={t} />
              </td>
              <td className={`${tdBase} text-right font-semibold text-neutral-900`}>
                {row.outstandingBalance != null
                  ? formatLKR(row.outstandingBalance)
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LedgerDescriptionCell({ row }: { row: LedgerEntry }) {
  return (
    <div className="space-y-1.5">
      <p className="font-semibold text-neutral-900">{row.title}</p>
      <ul className="space-y-0.5 text-neutral-600">
        {row.descriptionLines.map((line) => (
          <li key={line.label} className="flex flex-wrap gap-x-2 gap-y-0.5">
            <span>{line.label}:</span>
            <span className="font-medium text-neutral-800 tabular-nums">
              {formatLKR(line.amount)}
            </span>
          </li>
        ))}
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
    { emoji: string; labelKey: 'ledgerStatusPaid' | 'ledgerStatusPartial' | 'ledgerStatusOverdue'; className: string }
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
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      <span aria-hidden>{emoji}</span>
      {t(labelKey)}
    </span>
  );
}
