import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  PrinterIcon,
  PlusIcon,
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
import { useT } from '../../i18n/I18nProvider';
import { displayAllocationType } from '../../lib/i18n/simpleLabels';

export interface PaymentSuccessState {
  loanCode: string;
  loanId: string;
  customerName: string;
  customerCode?: string;
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
  const { t, language } = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as PaymentSuccessState | null;

  if (!state?.receipt) {
    return (
      <div className="max-w-lg mx-auto pt-12 text-center">
        <p className="text-neutral-600 mb-4">{t('noPaymentDetails')}</p>
        <Link
          to="/payments/new"
          className="text-brand-600 font-semibold hover:text-brand-500"
        >
          {t('recordPayment')}
        </Link>
      </div>
    );
  }

  const receiptNo = state.receiptNumber ?? '—';
  const loanStub = { repaymentMethod: state.repaymentMethod } as Pick<
    Loan,
    'repaymentMethod'
  >;

  const balanceAfter = isFixedInstallmentLoan(loanStub) && 'loanBalance' in state.receipt
    ? state.receipt.loanBalance
    : isInterestOnlyLoan(loanStub) && 'remainingPrincipal' in state.receipt
      ? state.receipt.remainingPrincipal
      : 0;

  return (
    <div className="max-w-xl mx-auto pt-6 pb-16 print:pt-0">
      <button
        type="button"
        onClick={() => navigate('/payments')}
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-neutral-600 hover:text-neutral-900 print:hidden"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {t('backToPayments')}
      </button>

      <div id="payment-receipt" className="bg-white shadow-lg ring-1 ring-neutral-200 rounded-2xl overflow-hidden print:shadow-none">
        <div className="bg-gradient-to-br from-success-600 to-success-700 px-6 py-8 text-center text-white print:bg-success-600">
          <CheckCircleIcon className="mx-auto h-12 w-12 mb-3 opacity-90" />
          <h1 className="text-2xl font-bold">{t('paymentRecordedTitle')}</h1>
          <p className="mt-2 font-mono text-lg tabular-nums">{receiptNo}</p>
          <p className="mt-1 text-sm text-success-100">
            {formatDate(state.paymentDate)}
          </p>
        </div>

        <div className="p-6 space-y-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <ReceiptField label={t('field.customer')} value={state.customerName} wide />
            <ReceiptField label={t('field.loan')} value={state.loanCode} mono />
            <ReceiptField
              label={t('paymentMethodLabel')}
              value={formatEnum(state.paymentMethod)}
            />
            <ReceiptField
              label={t('cashReceived')}
              value={formatLKR(state.receipt.cashReceived)}
              bold
            />
            {state.receipt.discountApplied > 0 && (
              <ReceiptField
                label={t('discountGivenLabel')}
                value={formatLKR(state.receipt.discountApplied)}
              />
            )}
            <ReceiptField
              label={t('totalApplied')}
              value={formatLKR(state.receipt.totalApplied)}
              bold
              accent
            />
            <ReceiptField
              label={t('balanceAfterShort')}
              value={formatLKR(balanceAfter)}
              bold
              wide
            />
          </dl>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">
              {t('allocationSummary')}
            </h2>
            {isFixedInstallmentLoan(loanStub) && 'lateFeePaid' in state.receipt && (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <SummaryChip label={t('lateFeePaid')} value={formatLKR(state.receipt.lateFeePaid)} />
                <SummaryChip label={t('installmentPaid')} value={formatLKR(state.receipt.installmentPaid)} />
                {state.receipt.advancePaid > 0 && (
                  <SummaryChip label={t('advancePaid')} value={formatLKR(state.receipt.advancePaid)} />
                )}
                <SummaryChip label={t('arrearsRemaining')} value={formatLKR(state.receipt.remainingArrears)} />
              </dl>
            )}
            {isInterestOnlyLoan(loanStub) && 'interestPaid' in state.receipt && (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <SummaryChip label={t('interestPaid')} value={formatLKR(state.receipt.interestPaid)} />
                <SummaryChip label={t('principalPaid')} value={formatLKR(state.receipt.principalPaid)} />
                <SummaryChip label={t('pendingInterestLabel')} value={formatLKR(state.receipt.pendingInterestRemaining)} />
                <SummaryChip label={t('principalBalanceAfter')} value={formatLKR(state.receipt.remainingPrincipal)} />
              </dl>
            )}
          </div>

          {state.allocationRows && state.allocationRows.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                {t('affectedByPayment')}
              </h3>
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-neutral-500 border-b border-neutral-200">
                    <th className="py-1.5 pr-2">{t('field.type')}</th>
                    <th className="py-1.5 pr-2">{t('period')}</th>
                    <th className="py-1.5 text-right">{t('paid')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {state.allocationRows.map((row, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-2 font-medium">{displayAllocationType(row.type, language)}</td>
                      <td className="py-1.5 pr-2 text-neutral-600">{row.period}</td>
                      <td className="py-1.5 text-right tabular-nums text-brand-600 font-medium">
                        {formatLKR(row.paidByPayment)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Link
                to={`/loans/${state.loanId}`}
                className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:text-brand-500 print:hidden"
              >
                {t('viewFullLoanSchedule')}
              </Link>
            </div>
          )}

          {!state.supabasePending && (
            <p className="text-xs text-success-700 bg-success-50 rounded-lg px-3 py-2 text-center">
              {t('misc.savedToLocalDemo')}
            </p>
          )}
        </div>

        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex flex-wrap gap-3 justify-center print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-neutral-900 ring-1 ring-neutral-300 hover:bg-neutral-50"
          >
            <PrinterIcon className="h-4 w-4" />
            {t('printReceipt')}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/loans/${state.loanId}`)}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-neutral-900 ring-1 ring-neutral-300 hover:bg-neutral-50"
          >
            {t('viewLoan')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/payments/new')}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500"
          >
            <PlusIcon className="h-4 w-4" />
            {t('recordAnotherPayment')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptField({
  label,
  value,
  mono,
  bold,
  accent,
  wide,
}: {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
  accent?: boolean;
  wide?: boolean;
}) {
  return (
    <div>
      <dt className="text-neutral-500">{label}</dt>
      <dd
        className={`mt-0.5 ${wide ? 'col-span-2' : ''} ${mono ? 'font-mono tabular-nums text-brand-700' : ''} ${bold ? 'font-semibold text-neutral-900' : 'text-neutral-800'} ${accent ? 'text-brand-700' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="font-semibold tabular-nums text-neutral-900">{value}</dd>
    </div>
  );
}
