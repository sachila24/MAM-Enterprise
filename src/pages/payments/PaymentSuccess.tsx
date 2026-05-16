import React, { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  PrinterIcon,
  PlusIcon,
  FileTextIcon,
  ArrowLeftIcon,
} from 'lucide-react';
import type {
  FixedInstallmentReceiptBreakdown,
  InterestOnlyReceiptBreakdown,
} from '../../lib/finance/receipt';
import type { AllocationDisplayRow } from '../../lib/finance/allocationDisplay';
import { isFixedInstallmentLoan, isInterestOnlyLoan } from '../../types/loan';
import type { Loan, RepaymentMethod } from '../../types/loan';
import { formatLKR, formatDate, formatEnum } from '../../lib/format';

const MAX_AFFECTED_ROWS = 5;

export interface PaymentSuccessState {
  loanCode: string;
  loanId: string;
  customerName: string;
  customerCode?: string;
  /** Cash received from customer */
  amount: number;
  discountAmount?: number;
  paymentMethod: string;
  paymentDate: string;
  repaymentMethod: RepaymentMethod;
  receipt: InterestOnlyReceiptBreakdown | FixedInstallmentReceiptBreakdown;
  allocationRows?: AllocationDisplayRow[];
  supabasePending?: boolean;
  receiptNumber?: string;
  paymentId?: string;
}

export function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as PaymentSuccessState | null;

  const allocationSlice = useMemo(() => {
    const rows = state?.allocationRows ?? [];
    return {
      shown: rows.slice(0, MAX_AFFECTED_ROWS),
      hasMore: rows.length > MAX_AFFECTED_ROWS,
      total: rows.length,
    };
  }, [state?.allocationRows]);

  if (!state?.receipt) {
    return (
      <div className="max-w-2xl mx-auto pt-12 text-center">
        <p className="text-neutral-600 mb-4">No payment details available.</p>
        <Link
          to="/payments/new"
          className="text-brand-600 font-semibold hover:text-brand-500"
        >
          Record a payment
        </Link>
      </div>
    );
  }

  const receiptNo = state.receiptNumber ?? '—';
  const loanStub = { repaymentMethod: state.repaymentMethod } as Pick<
    Loan,
    'repaymentMethod'
  >;
  const totalApplied = state.receipt.totalApplied;

  return (
    <div className="max-w-2xl mx-auto pt-6 pb-12 print:max-w-none print:px-6">
      <div className="mb-4 print:hidden">
        <button
          type="button"
          onClick={() => navigate('/payments')}
          className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to payments
        </button>
      </div>

      <div
        id="payment-receipt"
        className="bg-white shadow-md ring-1 ring-neutral-200 rounded-xl overflow-hidden print:shadow-none print:ring-0 print:rounded-none"
      >
        <div className="bg-gradient-to-br from-success-600 to-success-700 px-6 py-6 text-center text-white print:py-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/20 mb-3 print:hidden">
            <CheckCircleIcon className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold tracking-tight print:text-2xl">Payment Recorded</h1>
          <p className="mt-1 text-success-100 text-xs print:text-sm">Receipt</p>
          <p className="mt-2 text-xl font-bold font-mono tabular-nums tracking-wide">
            {receiptNo}
          </p>
          <p className="mt-1 text-xs text-success-100">{formatDate(state.paymentDate)}</p>
        </div>

        <div className="p-6 space-y-5 print:p-4 print:space-y-4">
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <div className="text-neutral-500 text-xs uppercase tracking-wide">Customer</div>
              <div className="font-semibold text-neutral-900">{state.customerName}</div>
              {state.customerCode && (
                <div className="text-xs text-neutral-500 tabular-nums">{state.customerCode}</div>
              )}
            </div>
            <div>
              <div className="text-neutral-500 text-xs uppercase tracking-wide">Loan code</div>
              <div className="font-mono font-semibold text-brand-600 tabular-nums">
                {state.loanCode}
              </div>
            </div>
            <div>
              <div className="text-neutral-500 text-xs uppercase tracking-wide">Payment method</div>
              <div className="font-medium">{formatEnum(state.paymentMethod)}</div>
            </div>
            <div>
              <div className="text-neutral-500 text-xs uppercase tracking-wide">Product</div>
              <div className="font-medium">{formatEnum(state.repaymentMethod)}</div>
            </div>
          </section>

          <section className="rounded-lg bg-brand-50 ring-1 ring-brand-100 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-brand-800">Cash received</span>
              <span className="font-bold tabular-nums text-brand-900">
                {formatLKR(state.receipt.cashReceived)}
              </span>
            </div>
            {state.receipt.discountApplied > 0 && (
              <div className="flex justify-between gap-4 mt-1">
                <span className="text-brand-800">Discount given</span>
                <span className="font-semibold tabular-nums text-brand-900">
                  {formatLKR(state.receipt.discountApplied)}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-brand-200 pt-2 mt-2">
              <span className="font-semibold text-brand-900">Total applied</span>
              <span className="text-lg font-bold tabular-nums text-brand-700">
                {formatLKR(totalApplied)}
              </span>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2 flex items-center gap-2">
              <FileTextIcon className="h-4 w-4" />
              Allocation summary
            </h2>
            {isInterestOnlyLoan(loanStub) && 'interestPaid' in state.receipt && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <ReceiptMetric
                  label="Interest paid"
                  value={formatLKR(state.receipt.interestPaid)}
                />
                <ReceiptMetric
                  label="Principal paid"
                  value={formatLKR(state.receipt.principalPaid)}
                />
                <ReceiptMetric
                  label="Pending interest after payment"
                  value={formatLKR(state.receipt.pendingInterestRemaining)}
                />
                <ReceiptMetric
                  label="Principal balance after payment"
                  value={formatLKR(state.receipt.remainingPrincipal)}
                />
                <ReceiptMetric
                  label="Next estimated interest"
                  value={formatLKR(state.receipt.nextEstimatedInterest)}
                  className="sm:col-span-2"
                />
              </dl>
            )}
            {isFixedInstallmentLoan(loanStub) && 'lateFeePaid' in state.receipt && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <ReceiptMetric
                  label="Late fee paid"
                  value={formatLKR(state.receipt.lateFeePaid)}
                />
                <ReceiptMetric
                  label="Installment paid"
                  value={formatLKR(state.receipt.installmentPaid)}
                />
                {state.receipt.advancePaid > 0 && (
                  <ReceiptMetric
                    label="Advance paid"
                    value={formatLKR(state.receipt.advancePaid)}
                  />
                )}
                <ReceiptMetric
                  label="Arrears remaining"
                  value={formatLKR(state.receipt.remainingArrears)}
                />
                <ReceiptMetric
                  label="Balance after payment"
                  value={formatLKR(state.receipt.loanBalance)}
                  highlight
                  className="sm:col-span-2"
                />
              </dl>
            )}
          </section>

          {allocationSlice.shown.length > 0 && (
            <section className="overflow-x-auto">
              <h3 className="text-xs font-semibold text-neutral-600 mb-2">
                Affected installments / allocations
              </h3>
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-500">
                    <th className="py-1.5 pr-2">Type</th>
                    <th className="py-1.5 pr-2">Period</th>
                    <th className="py-1.5 pr-2 text-right">Applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {allocationSlice.shown.map((row, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-2 font-medium">{row.type}</td>
                      <td className="py-1.5 pr-2 text-neutral-600 max-w-[10rem] truncate">
                        {row.period}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-brand-600">
                        {formatLKR(row.paidByPayment)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allocationSlice.hasMore && (
                <Link
                  to={`/loans/${state.loanId}`}
                  className="mt-2 inline-block text-sm font-semibold text-brand-600 hover:text-brand-500 print:hidden"
                >
                  View full loan schedule ({allocationSlice.total} lines)
                </Link>
              )}
            </section>
          )}

          <section className="border-t border-neutral-200 pt-4 print:pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-neutral-700">
              <div>
                <p className="font-medium text-neutral-900 mb-6">Customer signature</p>
                <div className="border-b border-neutral-400 h-px" />
              </div>
              <div>
                <p className="font-medium text-neutral-900 mb-6">Authorized by</p>
                <div className="border-b border-neutral-400 h-px" />
              </div>
            </div>
          </section>

          {!state.supabasePending && (
            <p className="text-xs text-success-700 bg-success-50 rounded-md px-3 py-2 text-center print:hidden">
              Saved to local demo storage
            </p>
          )}
        </div>

        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex flex-col sm:flex-row flex-wrap gap-2 justify-center print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-neutral-900 ring-1 ring-neutral-300 hover:bg-neutral-50"
          >
            <PrinterIcon className="h-4 w-4" />
            Print receipt
          </button>
          <button
            type="button"
            onClick={() => navigate(`/loans/${state.loanId}`)}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-neutral-900 ring-1 ring-neutral-300 hover:bg-neutral-50"
          >
            View loan
          </button>
          <button
            type="button"
            onClick={() => navigate('/payments/new')}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
          >
            <PlusIcon className="h-4 w-4" />
            Record another payment
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptMetric({
  label,
  value,
  highlight,
  className = '',
}: {
  label: string;
  value: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-md p-2.5 ring-1 ring-neutral-200 ${highlight ? 'bg-brand-50 ring-brand-200' : 'bg-neutral-50'} ${className}`}
    >
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd
        className={`mt-0.5 tabular-nums ${highlight ? 'text-base font-bold text-brand-700' : 'font-semibold text-neutral-900'}`}
      >
        {value}
      </dd>
    </div>
  );
}
