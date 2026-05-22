import React from 'react';
import { formatDate, formatLKR } from '../../lib/format';
import type { LedgerEntry, LedgerRowStatus } from '../../lib/display/ledgerDisplay';
import { useT } from '../../i18n/I18nProvider';
import { StatusChip } from '../ui/StatusChip';

interface LedgerTableProps {
  entries: LedgerEntry[];
  emptyMessage?: string;
}

const thBase =
  'px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600 first:pl-5 last:pr-5';
const tdBase =
  'px-4 h-11 align-middle text-sm first:pl-5 last:pr-5 [font-variant-numeric:tabular-nums]';

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
            <th className={`${thBase} text-left`}>{t('ledgerColDate')}</th>
            <th className={`${thBase} text-left`}>{t('ledgerColDescription')}</th>
            <th className={`${thBase} text-left`}>{t('ledgerColReference')}</th>
            <th className={`${thBase} text-right`}>{t('ledgerColDebit')}</th>
            <th className={`${thBase} text-right`}>{t('ledgerColCredit')}</th>
            <th className={`${thBase} text-right`}>{t('ledgerColBalance')}</th>
            <th className={`${thBase} text-center w-28`}>{t('ledgerColStatus')}</th>
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
              <td className={`${tdBase} text-left text-neutral-700`}>
                {formatDate(row.date)}
              </td>
              <td className={`${tdBase} text-left font-medium text-neutral-900`}>
                {row.description}
              </td>
              <td className={`${tdBase} text-left text-neutral-600`}>
                {row.reference ?? '—'}
              </td>
              <td className={`${tdBase} text-right text-neutral-800`}>
                {row.debit != null && row.debit > 0 ? formatLKR(row.debit) : '—'}
              </td>
              <td className={`${tdBase} text-right text-neutral-800`}>
                {row.credit != null && row.credit > 0 ? formatLKR(row.credit) : '—'}
              </td>
              <td className={`${tdBase} text-right font-semibold text-neutral-900`}>
                {formatLKR(row.balance)}
              </td>
              <td className={`${tdBase} text-center`}>
                <LedgerRowStatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LedgerRowStatusBadge({ status }: { status: LedgerRowStatus }) {
  const chipStatus =
    status === 'APPLIED'
      ? 'applied'
      : status === 'PAID'
        ? 'paid'
        : status === 'PARTIAL'
          ? 'partial'
          : 'pending';
  return (
    <span className="inline-flex justify-center w-full">
      <StatusChip status={chipStatus} showDot={false} />
    </span>
  );
}
