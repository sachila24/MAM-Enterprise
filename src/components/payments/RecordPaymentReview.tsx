import React, { useMemo, useState } from 'react';
import { XIcon } from 'lucide-react';
import type { Loan } from '../../types/entities';
import { isFixedInstallmentLoan, isInterestOnlyLoan } from '../../types/loan';
import { formatLKR } from '../../lib/format';
import type { AllocationDisplayRow } from '../../lib/finance/allocationDisplay';
import {
  getAllocationRowBadge,
  selectCompactAllocationRows,
} from '../../lib/finance/allocationDisplay';
import type { usePaymentComputation } from '../../pages/payments/usePaymentComputation';

type Computation = ReturnType<typeof usePaymentComputation>;

interface RecordPaymentReviewProps {
  loan: Loan;
  computation: Computation;
}

export function RecordPaymentReview({ loan, computation }: RecordPaymentReviewProps) {
  const { allocation, allocationRows, receipt, currentInstallmentNumber, cycles } =
    computation;
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const currentScheduleNumber = useMemo(() => {
    if (isFixedInstallmentLoan(loan)) return currentInstallmentNumber;
    if (isInterestOnlyLoan(loan)) {
      const current = cycles.find((c) => c.isCurrentCycle);
      return current?.cycleNumber ?? cycles[cycles.length - 1]?.cycleNumber ?? 1;
    }
    return 1;
  }, [loan, currentInstallmentNumber, cycles]);

  const compactRows = useMemo(
    () => selectCompactAllocationRows(allocationRows, currentScheduleNumber, 2),
    [allocationRows, currentScheduleNumber]
  );

  if (!allocation) return null;

  const hasMoreRows = allocationRows.length > compactRows.length;

  return (
    <div className="space-y-5">
      <section className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-5 sm:p-6">
        <header className="mb-4">
          <h3 className="text-base font-semibold text-neutral-900">
            Allocation preview
          </h3>
          <p className="mt-1 text-sm text-neutral-500">
            How this payment will be applied before you confirm.
          </p>
        </header>

        <AllocationSummaryCards loan={loan} receipt={receipt} allocation={allocation} />

        {allocationRows.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-medium text-neutral-900">
                Schedule impact
              </h4>
              {hasMoreRows && (
                <button
                  type="button"
                  onClick={() => setScheduleOpen(true)}
                  className="text-sm font-semibold text-brand-600 hover:text-brand-500"
                >
                  View full schedule
                </button>
              )}
            </div>
            <CompactAllocationTable rows={compactRows} />
            {hasMoreRows && (
              <button
                type="button"
                onClick={() => setScheduleOpen(true)}
                className="w-full rounded-lg border border-dashed border-neutral-300 py-2.5 text-sm font-medium text-neutral-600 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50/50 transition-colors"
              >
                View full schedule ({allocationRows.length} lines)
              </button>
            )}
          </div>
        )}
      </section>

      {scheduleOpen && (
        <FullScheduleModal
          rows={allocationRows}
          onClose={() => setScheduleOpen(false)}
        />
      )}
    </div>
  );
}

function AllocationSummaryCards({
  loan,
  receipt,
  allocation,
}: {
  loan: Loan;
  receipt: Computation['receipt'];
  allocation: NonNullable<Computation['allocation']>;
}) {
  if (isInterestOnlyLoan(loan) && receipt && 'interestPaid' in receipt) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="Interest paid" value={formatLKR(receipt.interestPaid)} />
        <SummaryCard label="Principal paid" value={formatLKR(receipt.principalPaid)} />
        <SummaryCard
          label="Arrears remaining"
          value={formatLKR(receipt.pendingInterestRemaining)}
        />
        <SummaryCard
          label="Loan balance"
          value={formatLKR(receipt.remainingPrincipal)}
        />
      </div>
    );
  }

  if (isFixedInstallmentLoan(loan) && receipt && 'lateFeePaid' in receipt) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="Late fees paid" value={formatLKR(receipt.lateFeePaid)} />
        <SummaryCard
          label="Installments paid"
          value={formatLKR(receipt.installmentPaid)}
        />
        <SummaryCard
          label="Arrears remaining"
          value={formatLKR(receipt.remainingArrears)}
        />
        <SummaryCard label="Loan balance" value={formatLKR(receipt.loanBalance)} />
      </div>
    );
  }

  return (
    <p className="text-sm text-neutral-500">
      Total allocated: {formatLKR(allocation.totalAllocated)}
    </p>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-3 ring-1 ring-neutral-200 min-h-[4.5rem] flex flex-col justify-center">
      <p className="text-xs font-medium text-neutral-500 leading-tight">{label}</p>
      <p className="mt-1.5 text-sm font-semibold text-neutral-900 tabular-nums">
        {value}
      </p>
    </div>
  );
}

function CompactAllocationTable({ rows }: { rows: AllocationDisplayRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-neutral-500 py-2">No schedule lines to display.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg ring-1 ring-neutral-200">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
            <th className="py-2.5 pl-3 pr-2">Type</th>
            <th className="py-2.5 pr-2">Period</th>
            <th className="py-2.5 pr-2 text-right">Due</th>
            <th className="py-2.5 pr-2 text-right">This payment</th>
            <th className="py-2.5 pr-3 text-right">Remaining</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <AllocationTableRow key={`${row.type}|${row.period}`} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AllocationTableRow({ row }: { row: AllocationDisplayRow }) {
  const badge = getAllocationRowBadge(row);
  const affected = row.paidByPayment > 0;

  return (
    <tr className={affected ? 'bg-brand-50/60' : undefined}>
      <td className="py-2 pl-3 pr-2 text-neutral-800">
        <span className="flex flex-wrap items-center gap-1.5">
          <span>{row.type}</span>
          {badge && <StatusBadge status={badge} />}
        </span>
      </td>
      <td className="py-2 pr-2 text-neutral-600 text-xs sm:text-sm">{row.period}</td>
      <td className="py-2 pr-2 text-right tabular-nums text-neutral-700">
        {formatLKR(row.due)}
      </td>
      <td className="py-2 pr-2 text-right tabular-nums text-brand-700">
        {row.paidByPayment > 0 ? formatLKR(row.paidByPayment) : '—'}
      </td>
      <td className="py-2 pr-3 text-right tabular-nums text-neutral-700">
        {formatLKR(row.remaining)}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: 'Paid' | 'Partial' | 'Remaining' }) {
  const styles = {
    Paid: 'bg-success-50 text-success-700 ring-success-600/20',
    Partial: 'bg-warning-50 text-warning-800 ring-warning-600/20',
    Remaining: 'bg-neutral-100 text-neutral-600 ring-neutral-500/20',
  };
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function FullScheduleModal({
  rows,
  onClose,
}: {
  rows: AllocationDisplayRow[];
  onClose: () => void;
}) {
  return (
    <div
      className="relative z-50"
      aria-labelledby="schedule-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="fixed inset-0 bg-neutral-900/60"
        aria-label="Close schedule"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-10 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
        <div className="pointer-events-auto relative w-full sm:max-w-3xl max-h-[90vh] flex flex-col bg-white shadow-xl sm:rounded-xl ring-1 ring-neutral-200">
          <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-4 py-3 sm:px-6 shrink-0">
            <div>
              <h3
                id="schedule-modal-title"
                className="text-base font-semibold text-neutral-900"
              >
                Full allocation schedule
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                All installments and fees considered for this payment
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
            >
              <span className="sr-only">Close</span>
              <XIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-y-auto px-4 py-4 sm:px-6 flex-1 min-h-0">
            <CompactAllocationTable rows={rows} />
          </div>
          <div className="border-t border-neutral-200 px-4 py-3 sm:px-6 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
