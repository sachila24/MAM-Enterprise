import React from 'react';
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
    <div className="max-w-3xl mx-auto pt-6 pb-16 print:pt-0">
      <div className="mb-6 print:hidden">
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
        className="bg-white shadow-lg ring-1 ring-neutral-200 rounded-2xl overflow-hidden print:shadow-none print:ring-0"
      >
        <div className="bg-gradient-to-br from-success-600 to-success-700 px-8 py-10 text-center text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 mb-4">
            <CheckCircleIcon className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Recorded</h1>
          <p className="mt-3 text-success-100 text-sm">Official receipt</p>
          <p className="mt-4 text-2xl font-bold font-mono tabular-nums tracking-wide">
            {receiptNo}
          </p>
          <p className="mt-2 text-sm text-success-100">
            {formatDate(state.paymentDate)}
          </p>
        </div>

        <div className="p-8 space-y-8">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">
              Customer & loan
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-neutral-500">Customer</dt>
                <dd className="font-semibold text-neutral-900">
                  {state.customerName}
                </dd>
                {state.customerCode && (
                  <dd className="text-xs text-neutral-500 tabular-nums mt-0.5">
                    {state.customerCode}
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-neutral-500">Loan</dt>
                <dd className="font-mono font-semibold text-brand-600 tabular-nums">
                  {state.loanCode}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Repayment method</dt>
                <dd className="font-medium text-neutral-900">
                  {formatEnum(state.repaymentMethod)}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Payment method</dt>
                <dd className="font-medium text-neutral-900">
                  {formatEnum(state.paymentMethod)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl bg-brand-50 ring-1 ring-brand-100 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-700 mb-3">
              Amounts
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-brand-800">Cash received</dt>
                <dd className="font-bold text-brand-900 tabular-nums">
                  {formatLKR(state.receipt.cashReceived)}
                </dd>
              </div>
              {state.receipt.discountApplied > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-brand-800">Discount given</dt>
                  <dd className="font-semibold text-brand-900 tabular-nums">
                    {formatLKR(state.receipt.discountApplied)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-brand-200 pt-2 mt-2">
                <dt className="font-semibold text-brand-900">Total applied</dt>
                <dd className="text-lg font-bold text-brand-700 tabular-nums">
                  {formatLKR(totalApplied)}
                </dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3 flex items-center gap-2">
              <FileTextIcon className="h-4 w-4" />
              Allocation breakdown
            </h2>
            {isInterestOnlyLoan(loanStub) &&
              'interestPaid' in state.receipt && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <ReceiptMetric
                    label="Interest paid"
                    value={formatLKR(state.receipt.interestPaid)}
                  />
                  <ReceiptMetric
                    label="Principal paid"
                    value={formatLKR(state.receipt.principalPaid)}
                  />
                  <ReceiptMetric
                    label="Pending interest"
                    value={formatLKR(state.receipt.pendingInterestRemaining)}
                  />
                  <ReceiptMetric
                    label="Remaining principal"
                    value={formatLKR(state.receipt.remainingPrincipal)}
                  />
                  <ReceiptMetric
                    label="Next estimated interest"
                    value={formatLKR(state.receipt.nextEstimatedInterest)}
                    className="sm:col-span-2"
                  />
                </dl>
              )}
            {isFixedInstallmentLoan(loanStub) &&
              'lateFeePaid' in state.receipt && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
                    label="Remaining arrears"
                    value={formatLKR(state.receipt.remainingArrears)}
                  />
                  <ReceiptMetric
                    label="Loan balance after payment"
                    value={formatLKR(state.receipt.loanBalance)}
                    highlight
                    className="sm:col-span-2"
                  />
                </dl>
              )}
          </section>

          {state.allocationRows && state.allocationRows.length > 0 && (
            <section className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-500">
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Period</th>
                    <th className="py-2 pr-3 text-right">Paid</th>
                    <th className="py-2 text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {state.allocationRows.map((row, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-3 font-medium">{row.type}</td>
                      <td className="py-2 pr-3 text-neutral-600">
                        {row.period}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-brand-600">
                        {formatLKR(row.paidByPayment)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatLKR(row.remaining)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {!state.supabasePending && (
            <p className="text-xs text-success-700 bg-success-50 rounded-lg px-3 py-2 text-center">
              Saved to local demo storage
            </p>
          )}
        </div>

        <div className="px-8 py-6 bg-neutral-50 border-t border-neutral-100 flex flex-col sm:flex-row flex-wrap gap-3 justify-center print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 ring-1 ring-neutral-300 hover:bg-neutral-50"
          >
            <PrinterIcon className="h-4 w-4" />
            Print receipt
          </button>
          <button
            type="button"
            onClick={() => navigate(`/loans/${state.loanId}`)}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 ring-1 ring-neutral-300 hover:bg-neutral-50"
          >
            View loan
          </button>
          <button
            type="button"
            onClick={() => navigate('/payments/new')}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500"
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
      className={`rounded-lg p-3 ring-1 ring-neutral-200 ${highlight ? 'bg-brand-50 ring-brand-200' : 'bg-neutral-50'} ${className}`}
    >
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd
        className={`mt-1 tabular-nums ${highlight ? 'text-lg font-bold text-brand-700' : 'font-semibold text-neutral-900'}`}
      >
        {value}
      </dd>
    </div>
  );
}
