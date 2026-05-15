import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  PrinterIcon,
  PlusIcon,
  FileTextIcon,
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
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  repaymentMethod: RepaymentMethod;
  receipt: InterestOnlyReceiptBreakdown | FixedInstallmentReceiptBreakdown;
  allocationRows?: AllocationDisplayRow[];
  supabasePending?: boolean;
  receiptNumber?: string;
}

export function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as PaymentSuccessState | null;

  const receiptNo =
    state?.receiptNumber ??
    `RCP-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`;

  if (!state) {
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

  const loanStub = {
    repaymentMethod: state.repaymentMethod,
  } as Pick<Loan, 'repaymentMethod'>;

  return (
    <div className="max-w-2xl mx-auto pt-8 pb-12">
      <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-xl overflow-hidden">
        <div className="p-8 text-center border-b border-neutral-100">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-100 mb-4">
            <CheckCircleIcon className="h-10 w-10 text-success-600" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900">
            Payment saved successfully
          </h2>
          <p className="mt-2 text-neutral-500">
            Receipt{' '}
            <span className="font-medium text-neutral-900 tabular-nums">
              {receiptNo}
            </span>
          </p>
          {!state.supabasePending && state.receiptNumber && (
            <p className="mt-3 text-sm text-success-700 bg-success-50 rounded-md px-3 py-2 inline-block">
              Saved to local demo storage · receipt {state.receiptNumber}
            </p>
          )}
        </div>

        <div className="p-6 space-y-4 text-sm">
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-neutral-500">Customer</dt>
              <dd className="font-medium">{state.customerName}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Loan</dt>
              <dd className="font-mono tabular-nums">{state.loanCode}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Amount</dt>
              <dd className="font-bold text-brand-600 tabular-nums">
                {formatLKR(state.amount)}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Date</dt>
              <dd>{formatDate(state.paymentDate)}</dd>
            </div>
          </dl>

          <div className="rounded-lg bg-neutral-50 p-4 ring-1 ring-neutral-200">
            <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <FileTextIcon className="h-4 w-4" />
              Receipt breakdown
            </h3>
            {isInterestOnlyLoan(loanStub) &&
              'interestPaid' in state.receipt && (
                <ul className="space-y-1 text-neutral-700">
                  <li>
                    Interest paid:{' '}
                    <strong>{formatLKR(state.receipt.interestPaid)}</strong>
                  </li>
                  <li>
                    Principal paid:{' '}
                    <strong>{formatLKR(state.receipt.principalPaid)}</strong>
                  </li>
                  <li>
                    Remaining principal:{' '}
                    <strong>
                      {formatLKR(state.receipt.remainingPrincipal)}
                    </strong>
                  </li>
                  {state.receipt.pendingInterestRemaining > 0 && (
                    <li>
                      Pending interest:{' '}
                      <strong>
                        {formatLKR(state.receipt.pendingInterestRemaining)}
                      </strong>
                    </li>
                  )}
                  <li>
                    Next est. interest:{' '}
                    <strong>
                      {formatLKR(state.receipt.nextEstimatedInterest)}
                    </strong>
                  </li>
                </ul>
              )}
            {isFixedInstallmentLoan(loanStub) &&
              'lateFeePaid' in state.receipt && (
                <ul className="space-y-1 text-neutral-700">
                  <li>
                    Late fee paid:{' '}
                    <strong>{formatLKR(state.receipt.lateFeePaid)}</strong>
                  </li>
                  <li>
                    Installment paid:{' '}
                    <strong>{formatLKR(state.receipt.installmentPaid)}</strong>
                  </li>
                  {state.receipt.advancePaid > 0 && (
                    <li>
                      Advance paid:{' '}
                      <strong>{formatLKR(state.receipt.advancePaid)}</strong>
                    </li>
                  )}
                  <li>
                    Remaining arrears:{' '}
                    <strong>{formatLKR(state.receipt.remainingArrears)}</strong>
                  </li>
                  <li>
                    Loan balance:{' '}
                    <strong>{formatLKR(state.receipt.loanBalance)}</strong>
                  </li>
                </ul>
              )}
          </div>

          <p className="text-xs text-neutral-500">
            Method: {formatEnum(state.paymentMethod)}
          </p>
        </div>

        <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 ring-1 ring-neutral-300 hover:bg-neutral-50"
          >
            <PrinterIcon className="h-4 w-4" />
            Download receipt
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

