import React from 'react';
import { formatDate, formatLKR } from '../../lib/format';
import { StatusChip } from '../ui/StatusChip';

export interface InstallmentScheduleRow {
  id: string;
  installmentNumber: number;
  dueDate: string;
  installmentAmount: number;
  paidAmount: number;
  overdueMonths: number;
  lateFeeAccrued: number;
  remaining: number;
  displayStatus: string;
}

interface InstallmentScheduleTableProps {
  rows: InstallmentScheduleRow[];
  emptyMessage?: string;
  showMonthsLate?: boolean;
}

const thBase =
  'px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600 first:pl-5 last:pr-5';
const tdBase =
  'px-4 h-11 align-middle text-sm first:pl-5 last:pr-5 [font-variant-numeric:tabular-nums]';

export function InstallmentScheduleTable({
  rows,
  emptyMessage = 'No installments on this loan.',
  showMonthsLate = true,
}: InstallmentScheduleTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-neutral-500 py-8 text-center bg-white rounded-xl ring-1 ring-neutral-200">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-neutral-200">
      <table className="min-w-full text-sm border-collapse">
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th className={`${thBase} text-center w-14`}>No.</th>
            <th className={`${thBase} text-left`}>Due date</th>
            <th className={`${thBase} text-right`}>Installment</th>
            <th className={`${thBase} text-right`}>Paid</th>
            {showMonthsLate && (
              <th className={`${thBase} text-center w-24`}>Months late</th>
            )}
            <th className={`${thBase} text-right`}>Late fee</th>
            <th className={`${thBase} text-right`}>Remaining</th>
            <th className={`${thBase} text-center w-32`}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id}
              className={`border-b border-neutral-100 last:border-0 ${
                index % 2 === 1 ? 'bg-neutral-50/80' : 'bg-white'
              } hover:bg-brand-50/40`}
            >
              <td className={`${tdBase} text-center font-medium text-neutral-900`}>
                {row.installmentNumber}
              </td>
              <td className={`${tdBase} text-left text-neutral-700`}>
                {formatDate(row.dueDate)}
              </td>
              <td className={`${tdBase} text-right text-neutral-800`}>
                {formatLKR(row.installmentAmount)}
              </td>
              <td className={`${tdBase} text-right text-neutral-800`}>
                {formatLKR(row.paidAmount)}
              </td>
              {showMonthsLate && (
                <td className={`${tdBase} text-center text-neutral-600`}>
                  {row.overdueMonths}
                </td>
              )}
              <td className={`${tdBase} text-right text-neutral-800`}>
                {formatLKR(row.lateFeeAccrued)}
              </td>
              <td className={`${tdBase} text-right font-medium text-neutral-900`}>
                {formatLKR(row.remaining)}
              </td>
              <td className={`${tdBase} text-center`}>
                <div className="flex justify-center items-center h-7">
                  <span className="inline-flex w-[5.75rem] justify-center">
                    <StatusChip status={row.displayStatus} showDot={false} />
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
