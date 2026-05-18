import React, { useMemo, useState } from 'react';
import { XIcon } from 'lucide-react';
import type { Loan } from '../../types/entities';
import { isFixedInstallmentLoan, isInterestOnlyLoan } from '../../types/loan';
import { formatLKR } from '../../lib/format';
import {
  displayAllocationBadge,
  displayAllocationType,
  type DisplayMode,
  type LabelKey,
} from '../../lib/i18n/simpleLabels';
import type { AllocationDisplayRow } from '../../lib/finance/allocationDisplay';
import { useT } from '../../i18n/I18nProvider';
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
  const { t, language } = useT();
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
            {t('allocationPreview')}
          </h3>
          <p className="mt-1 text-sm text-neutral-500">
            {t('allocationPreviewHint')}
          </p>
        </header>

        <AllocationSummaryCards
          loan={loan}
          receipt={receipt}
          allocation={allocation}
          t={t}
        />

        {allocationRows.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-medium text-neutral-900">
                {t('scheduleImpact')}
              </h4>
              {hasMoreRows && (
                <button
                  type="button"
                  onClick={() => setScheduleOpen(true)}
                  className="text-sm font-semibold text-brand-600 hover:text-brand-500"
                >
                  {t('viewFullSchedule')}
                </button>
              )}
            </div>
            <CompactAllocationTable rows={compactRows} t={t} language={language} />
            {hasMoreRows && (
              <button
                type="button"
                onClick={() => setScheduleOpen(true)}
                className="w-full rounded-lg border border-dashed border-neutral-300 py-2.5 text-sm font-medium text-neutral-600 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50/50 transition-colors"
              >
                {t('viewFullSchedule')} ({allocationRows.length} lines)
              </button>
            )}
          </div>
        )}
      </section>

      {scheduleOpen && (
        <FullScheduleModal
          rows={allocationRows}
          onClose={() => setScheduleOpen(false)}
          t={t}
          language={language}
        />
      )}
    </div>
  );
}

function AllocationSummaryCards({
  loan,
  receipt,
  allocation,
  t,
}: {
  loan: Loan;
  receipt: Computation['receipt'];
  allocation: NonNullable<Computation['allocation']>;
  t: (key: LabelKey) => string;
}) {
  if (isInterestOnlyLoan(loan) && receipt && 'interestPaid' in receipt) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label={t('interestPaid')} value={formatLKR(receipt.interestPaid)} />
        <SummaryCard label={t('principalPaid')} value={formatLKR(receipt.principalPaid)} />
        <SummaryCard
          label={t('arrearsRemaining')}
          value={formatLKR(receipt.pendingInterestRemaining)}
        />
        <SummaryCard
          label={t('loanBalance')}
          value={formatLKR(receipt.remainingPrincipal)}
        />
      </div>
    );
  }

  if (isFixedInstallmentLoan(loan) && receipt && 'lateFeePaid' in receipt) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label={t('lateFeePaid')} value={formatLKR(receipt.lateFeePaid)} />
        <SummaryCard
          label={t('installmentPaid')}
          value={formatLKR(receipt.installmentPaid)}
        />
        <SummaryCard
          label={t('arrearsRemaining')}
          value={formatLKR(receipt.remainingArrears)}
        />
        <SummaryCard label={t('loanBalance')} value={formatLKR(receipt.loanBalance)} />
      </div>
    );
  }

  return (
    <p className="text-sm text-neutral-500">
      {t('totalAllocated')}: {formatLKR(allocation.totalAllocated)}
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

function CompactAllocationTable({
  rows,
  t,
  language,
}: {
  rows: AllocationDisplayRow[];
  t: (key: LabelKey) => string;
  language: DisplayMode;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-neutral-500 py-2">{t('noScheduleLines')}</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg ring-1 ring-neutral-200">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
            <th className="py-2.5 pl-3 pr-2">{t('field.type')}</th>
            <th className="py-2.5 pr-2">{t('period')}</th>
            <th className="py-2.5 pr-2 text-right">{t('due')}</th>
            <th className="py-2.5 pr-2 text-right">{t('thisPayment')}</th>
            <th className="py-2.5 pr-3 text-right">{t('remaining')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <AllocationTableRow
              key={`${row.type}|${row.period}`}
              row={row}
              language={language}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AllocationTableRow({
  row,
  language,
}: {
  row: AllocationDisplayRow;
  language: DisplayMode;
}) {
  const badge = getAllocationRowBadge(row);
  const affected = row.paidByPayment > 0;

  return (
    <tr className={affected ? 'bg-brand-50/60' : undefined}>
      <td className="py-2 pl-3 pr-2 text-neutral-800">
        <span className="flex flex-wrap items-center gap-1.5">
          <span>{displayAllocationType(row.type, language)}</span>
          {badge && <StatusBadge status={badge} language={language} />}
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

function StatusBadge({
  status,
  language,
}: {
  status: 'Paid' | 'Partial' | 'Remaining';
  language: DisplayMode;
}) {
  const styles = {
    Paid: 'bg-success-50 text-success-700 ring-success-600/20',
    Partial: 'bg-warning-50 text-warning-800 ring-warning-600/20',
    Remaining: 'bg-neutral-100 text-neutral-600 ring-neutral-500/20',
  };
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${styles[status]}`}
    >
      {displayAllocationBadge(status, language)}
    </span>
  );
}

function FullScheduleModal({
  rows,
  onClose,
  t,
  language,
}: {
  rows: AllocationDisplayRow[];
  onClose: () => void;
  t: (key: LabelKey) => string;
  language: DisplayMode;
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
        aria-label={t('action.close')}
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
                {t('fullAllocationSchedule')}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                {t('fullScheduleHint')}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
            >
              <span className="sr-only">{t('action.close')}</span>
              <XIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-y-auto px-4 py-4 sm:px-6 flex-1 min-h-0">
            <CompactAllocationTable rows={rows} t={t} language={language} />
          </div>
          <div className="border-t border-neutral-200 px-4 py-3 sm:px-6 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
            >
              {t('action.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
