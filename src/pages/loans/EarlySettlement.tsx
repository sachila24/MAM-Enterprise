import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DatePicker } from '../../components/ui/DatePicker';
import { useToast } from '../../components/ui/Toast';
import {
  calculateEarlySettlementQuote,
  canRequestEarlySettlement,
} from '../../lib/finance/earlySettlement';
import { summarizeFixedInstallmentDue } from '../../lib/finance/paymentAllocation';
import { resolveCurrentInstallmentNumber } from '../../lib/finance/fixedInstallmentStatus';
import { formatLKR } from '../../lib/format';
import { roundLKR } from '../../lib/finance/money';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import { getLoanDetailFromDb } from '../../lib/local-db/loanDetail';
import { confirmEarlySettlement } from '../../lib/local-db/repositories/earlySettlementRepo';
import { isFixedInstallmentLoan } from '../../types/loan';
import { useT } from '../../i18n/I18nProvider';
import { formatMessage } from '../../lib/i18n/messages';
import { getSystemToday, useSystemToday } from '../../lib/time/systemTime';

export function EarlySettlement() {
  const { id: loanId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, tf, language } = useT();
  const { showToast } = useToast();
  const db = useDemoDb();
  const systemToday = useSystemToday();
  const [discountPercentInput, setDiscountPercentInput] = useState('10');
  const [includeCurrentMonth, setIncludeCurrentMonth] = useState(true);
  const [settlementDate, setSettlementDate] = useState(
    getSystemToday()
  );

  useEffect(() => {
    setSettlementDate(systemToday);
  }, [systemToday]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const detail = useMemo(
    () => (loanId ? getLoanDetailFromDb(loanId, db) : null),
    [loanId, db]
  );

  const quoteInputs = useMemo(() => {
    if (!detail || !isFixedInstallmentLoan(detail.loan)) return null;
    const { loan, installments } = detail;
    const totalPayable = loan.totalPayable ?? loan.balanceAmount;
    const paidRatio = totalPayable > 0 ? loan.paidAmount / totalPayable : 0;
    const remainingPrincipal = roundLKR(loan.principalAmount * (1 - paidRatio));
    const remainingInterest = roundLKR(
      Math.max(0, loan.balanceAmount - remainingPrincipal)
    );
    const instAlloc = installments.map((i) => ({
      id: i.id,
      installmentNumber: i.installmentNumber,
      dueDate: i.dueDate,
      installmentAmount: i.installmentAmount,
      paidAmount: i.paidAmount,
      lateFeeAmount: i.lateFeeAmount,
      lateFeePaid: i.lateFeePaid,
    }));
    const currentNum = resolveCurrentInstallmentNumber(
      instAlloc,
      settlementDate
    );
    const dueSummary = summarizeFixedInstallmentDue({
      installments: instAlloc,
      paymentDate: settlementDate,
      lateFeeRatePercent: loan.lateFeeRate,
      monthlyInstallmentAmount: loan.installmentAmount,
      currentInstallmentNumber: currentNum,
      lateFeeExemptByInstallmentId: detail.lateFeeExemptByInstallmentId,
    });
    return {
      remainingPrincipal,
      remainingInterest,
      currentMonthDue: dueSummary.currentMonthDue + dueSummary.totalLateFeesDue,
      monthlyInstallment: loan.installmentAmount ?? 0,
    };
  }, [detail, settlementDate]);

  const discountPercentage = parseFloat(discountPercentInput) || 0;

  const quote = useMemo(() => {
    if (!detail || !quoteInputs) return null;
    return calculateEarlySettlementQuote({
      monthsCompleted: detail.monthsCompleted,
      minimumMonthsBeforeSettlement: detail.loan.minimumMonthsBeforeSettlement,
      remainingPrincipal: quoteInputs.remainingPrincipal,
      remainingInterest: quoteInputs.remainingInterest,
      discountPercentage,
      currentMonthDue: quoteInputs.currentMonthDue,
      includeCurrentMonthDue: includeCurrentMonth,
    });
  }, [detail, quoteInputs, discountPercentage, includeCurrentMonth]);

  const eligible =
    detail &&
    isFixedInstallmentLoan(detail.loan) &&
    canRequestEarlySettlement(
      detail.monthsCompleted,
      detail.loan.minimumMonthsBeforeSettlement
    );

  if (!loanId || !detail) {
    return (
      <div className="max-w-2xl mx-auto pt-12 text-center">
        <p className="text-neutral-600 mb-4">{t('loanNotFound')}</p>
        <Link to="/loans" className="text-brand-600 font-semibold">
          {t('backToLoans')}
        </Link>
      </div>
    );
  }

  if (!isFixedInstallmentLoan(detail.loan)) {
    return (
      <div className="max-w-2xl mx-auto pt-8">
        <PageHeader
          title={t('earlySettlement')}
          subtitle={t('earlySettlementNotAvailable')}
        />
        <Link
          to={`/loans/${loanId}`}
          className="text-sm font-semibold text-brand-600"
        >
          {t('backToLoan')}
        </Link>
      </div>
    );
  }

  const handleConfirm = () => {
    if (!eligible || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { settlementCode, paymentId } = confirmEarlySettlement(
        {
          loanId,
          settlementDate,
          discountPercentage,
          includeCurrentMonthDue: includeCurrentMonth,
        },
        db
      );
      showToast(
        formatMessage('earlySettlementRecorded', { code: settlementCode }, language),
        'success'
      );
      const receiptDoc = db.documents.find(
        (d) =>
          d.payment_id === paymentId && d.document_type === 'PAYMENT_RECEIPT'
      );
      if (receiptDoc) {
        navigate(`/documents/${receiptDoc.id}?print=1`, { replace: true });
      } else {
        navigate(`/loans/${loanId}`, { replace: true });
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t('couldNotConfirmSettlement'),
        'error'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <button
        type="button"
        onClick={() => navigate(`/loans/${loanId}`)}
        className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-600 hover:text-neutral-900 mb-4"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {t('backToLoan')}
      </button>

      <PageHeader
        title={t('earlySettlement')}
        subtitle={`${detail.customer.name} · ${detail.loan.loanCode}`}
      />

      {!eligible && (
        <p className="mb-4 rounded-lg bg-warning-50 border border-warning-200 px-4 py-3 text-sm text-warning-800">
          {tf('earlySettlementEligibleAfter', {
            months: detail.loan.minimumMonthsBeforeSettlement,
            completed: detail.monthsCompleted,
          })}
        </p>
      )}

      <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-6 space-y-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <QuoteRow label={t('loanCodeLabel')} value={detail.loan.loanCode} mono />
          <QuoteRow label={t('field.customer')} value={detail.customer.name} />
          <QuoteRow
            label={t('financeAmount')}
            value={formatLKR(detail.loan.principalAmount)}
          />
          <QuoteRow
            label={t('termMonths')}
            value={
              detail.loan.termMonths != null
                ? tf('termMonthsCount', { count: detail.loan.termMonths })
                : '—'
            }
          />
          <QuoteRow
            label={t('monthsCompleted')}
            value={String(detail.monthsCompleted)}
          />
          <QuoteRow
            label={t('monthlyInstallment')}
            value={formatLKR(quoteInputs?.monthlyInstallment ?? 0)}
          />
          {quoteInputs && (
            <>
              <QuoteRow
                label={t('remainingPrincipal')}
                value={formatLKR(quoteInputs.remainingPrincipal)}
              />
              <QuoteRow
                label={t('remainingInterest')}
                value={formatLKR(quoteInputs.remainingInterest)}
              />
            </>
          )}
        </dl>

        <div className="border-t border-neutral-200 pt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-1">
              {t('discountOnRemainingInterest')}
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={discountPercentInput}
              onChange={(e) => setDiscountPercentInput(e.target.value)}
              disabled={!eligible}
              className="block w-full max-w-xs rounded-md border-0 py-2 px-3 ring-1 ring-inset ring-neutral-300 sm:text-sm disabled:opacity-50"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={includeCurrentMonth}
              onChange={(e) => setIncludeCurrentMonth(e.target.checked)}
              disabled={!eligible}
              className="rounded border-neutral-300 text-brand-600"
            />
            {t('includeCurrentMonthDueSettlement')}
          </label>
          <DatePicker
            label={t('settlementDate')}
            value={settlementDate}
            onChange={(e) => setSettlementDate(e.target.value)}
          />
        </div>

        {quote && (
          <div className="rounded-lg bg-brand-50 ring-1 ring-brand-100 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-brand-800">{t('interestDiscount')}</span>
              <span className="font-semibold tabular-nums">
                {formatLKR(quote.discountAmount)}
              </span>
            </div>
            {includeCurrentMonth && quote.currentMonthDue > 0 && (
              <div className="flex justify-between">
                <span className="text-brand-800">{t('currentMonthDue')}</span>
                <span className="font-semibold tabular-nums">
                  {formatLKR(quote.currentMonthDue)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-brand-200 pt-2">
              <span className="font-semibold text-brand-900">
                {t('finalSettlementPayable')}
              </span>
              <span className="text-lg font-bold text-brand-700 tabular-nums">
                {formatLKR(quote.finalSettlementAmount)}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!eligible || isSubmitting}
          className="w-full sm:w-auto rounded-md bg-success-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-success-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? t('savingSettlement')
            : eligible
              ? t('confirmSettlement')
              : t('settlementNotAvailableYet')}
        </button>
      </div>
    </div>
  );
}

function QuoteRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-neutral-500">{label}</dt>
      <dd
        className={`mt-0.5 font-medium text-neutral-900 ${mono ? 'font-mono tabular-nums text-brand-700' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}
