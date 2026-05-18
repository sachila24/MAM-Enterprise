import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircleIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { CustomerSearchSelect } from '../../components/customers/CustomerSearchSelect';
import { filterAffectedAllocationRows } from '../../lib/finance/allocationDisplay';
import { useToast } from '../../components/ui/Toast';
import { Stepper } from '../../components/ui/Stepper';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { DatePicker } from '../../components/ui/DatePicker';
import { EmptyState } from '../../components/ui/EmptyState';
import type { Customer, Loan } from '../../types/entities';
import type { PaymentMethod } from '../../types/loan';
import { isFixedInstallmentLoan, isInterestOnlyLoan } from '../../types/loan';
import { formatLKR, formatDate, formatEnum } from '../../lib/format';
import { usePaymentComputation, type PaymentFormState } from './usePaymentComputation';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import { buildPaymentBundle } from '../../lib/local-db/paymentBundle';
import { recordPayment } from '../../lib/local-db/repositories';
import { RecordPaymentReview } from '../../components/payments/RecordPaymentReview';
import { useT } from '../../i18n/I18nProvider';

export function RecordPayment() {
  const { t } = useT();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const STEPS = [
    { id: 'customer', label: t('stepCustomer') },
    { label: t('stepLoan') },
    { label: t('stepPayment') },
    { label: t('stepReview') },
    { label: t('stepConfirm') },
  ];
  const db = useDemoDb();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const toastShownRef = useRef(false);
  const clientSubmitIdRef = useRef<string | null>(null);
  const previewBundle = useMemo(() => buildPaymentBundle(db), [db]);
  const [searchParams] = useSearchParams();
  const initialLoanId = searchParams.get('loanId');

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(
    initialLoanId
  );
  const [loanSearch, setLoanSearch] = useState('');

  const [form, setForm] = useState<PaymentFormState>({
    amount: 0,
    discountAmount: 0,
    paymentMethod: 'CASH',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
    chequeNumber: '',
    bankReference: '',
  });

  const customers = previewBundle?.customers ?? [];
  const loans = previewBundle?.loans ?? [];

  const selectedCustomer = selectedCustomerId
    ? customers.find((c) => c.id === selectedCustomerId)
    : null;

  const customerLoans = useMemo(
    () =>
      selectedCustomerId
        ? loans.filter((l) => l.customerId === selectedCustomerId)
        : [],
    [loans, selectedCustomerId]
  );

  const selectedLoan = selectedLoanId
    ? loans.find((l) => l.id === selectedLoanId)
    : null;

  const computation = usePaymentComputation(selectedLoan, previewBundle, form);

  useEffect(() => {
    if (initialLoanId && loans.length > 0) {
      const loan = loans.find((l) => l.id === initialLoanId);
      if (loan) {
        setSelectedCustomerId(loan.customerId);
        setSelectedLoanId(loan.id);
        setCurrentStep(1);
      }
    }
  }, [initialLoanId, loans]);

  const filteredLoans = customerLoans.filter(
    (l) =>
      !loanSearch ||
      l.loanCode.toLowerCase().includes(loanSearch.toLowerCase()) ||
      formatEnum(l.loanPurpose).toLowerCase().includes(loanSearch.toLowerCase())
  );

  const canContinue = (): boolean => {
    switch (currentStep) {
      case 0:
        return !!selectedCustomerId;
      case 1:
        return !!selectedLoanId;
      case 2:
        return form.amount > 0 || (form.discountAmount ?? 0) > 0;
      case 3:
        return !!computation.allocation;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!canContinue()) return;
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
    else navigate('/payments');
  };

  useEffect(() => {
    if (currentStep === STEPS.length - 1 && !clientSubmitIdRef.current) {
      clientSubmitIdRef.current = crypto.randomUUID();
    }
  }, [currentStep]);

  const handleConfirm = () => {
    if (
      isSubmittingRef.current ||
      !selectedLoan ||
      !selectedCustomer ||
      !computation.allocation ||
      !computation.receipt
    ) {
      return;
    }

    if (!clientSubmitIdRef.current) {
      clientSubmitIdRef.current = crypto.randomUUID();
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    toastShownRef.current = false;

    const receiptRows = filterAffectedAllocationRows(
      computation.allocationRows,
      5
    );

    const successState = {
      loanCode: selectedLoan.loanCode,
      loanId: selectedLoan.id,
      customerCode: selectedCustomer.customerCode,
      customerName: selectedCustomer.name,
      amount: form.amount,
      discountAmount: form.discountAmount ?? 0,
      paymentMethod: form.paymentMethod,
      paymentDate: form.paymentDate,
      repaymentMethod: selectedLoan.repaymentMethod,
      receipt: computation.receipt,
      allocationRows: receiptRows,
      supabasePending: false,
    };

    try {
      const result = recordPayment(
        {
          loanId: selectedLoan.id,
          customerId: selectedCustomer.id,
          amount: form.amount,
          discountAmount: form.discountAmount,
          paymentMethod: form.paymentMethod,
          paymentDate: form.paymentDate,
          notes: form.notes || undefined,
          chequeNumber: form.chequeNumber || undefined,
          bankReference: form.bankReference || undefined,
          clientSubmitId: clientSubmitIdRef.current,
        },
        db
      );
      navigate('/payments/success', {
        replace: true,
        state: {
          ...successState,
          receiptNumber: result.receiptNumber,
          paymentId: result.payment.id,
        },
      });
      if (!toastShownRef.current) {
        toastShownRef.current = true;
        showToast(t('paymentRecorded'), 'success');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('paymentSaveFailed');
      showToast(message, 'error');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const primaryLabel = (): string => {
    if (currentStep === STEPS.length - 1) {
      return isSubmitting ? t('savingPayment') : t('confirmPaymentBtn');
    }
    if (currentStep === 2) return t('reviewPayment');
    return t('action.continue');
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <PageHeader
        title={t('recordPayment')}
        subtitle={t('recordPaymentSubtitle')}
      />

      <div className="mb-8 max-w-4xl">
        <Stepper steps={STEPS} current={currentStep} />
      </div>

      {!previewBundle && (
        <div className="mb-8 rounded-lg bg-warning-50 border border-warning-200 p-4 text-sm text-warning-800">
          No loan data loaded yet. Connect Supabase later, or load a preview
          scenario to test allocation calculations.
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-10">
        <div
          className={`flex-1 min-w-0 lg:max-w-[58%] space-y-6 ${
            currentStep === 3
              ? 'lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1'
              : ''
          }`}
        >
          {/* Step 0: Customer */}
          {currentStep === 0 && (
            <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                {t('selectCustomer')}
              </h3>

              {customers.length === 0 ? (
                <EmptyState
                  icon={AlertCircleIcon}
                  title={t('noCustomersAvailable')}
                  description={t('noCustomersAvailableHint')}
                />
              ) : (
                <>
                  <CustomerSearchSelect
                    customers={customers}
                    selectedCustomerId={selectedCustomerId}
                    onSelect={(id) => {
                      setSelectedCustomerId(id);
                      setSelectedLoanId(null);
                    }}
                  />
                  <p className="mt-3 text-xs text-neutral-500">
                    {t('misc.localDemo')} · {previewBundle.label}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Step 1: Loan */}
          {currentStep === 1 && (
            <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                {t('selectLoan')}
              </h3>
              <p className="text-sm text-neutral-500 mb-4">
                {selectedCustomer?.name}
              </p>
              <input
                type="text"
                value={loanSearch}
                onChange={(e) => setLoanSearch(e.target.value)}
                placeholder={t('searchLoan')}
                className="block w-full rounded-md border-0 py-2 px-3 ring-1 ring-inset ring-neutral-300 sm:text-sm mb-4"
              />
              <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 overflow-hidden">
                {filteredLoans.map((loan) => (
                  <li key={loan.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedLoanId(loan.id)}
                      className={`w-full flex justify-between items-center px-4 py-3 hover:bg-brand-50 ${
                        selectedLoanId === loan.id ? 'bg-brand-50' : ''
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-medium text-brand-700 tabular-nums">
                          {loan.loanCode}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {formatEnum(loan.repaymentMethod)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums">
                        {formatLKR(loan.balanceAmount)}
                      </p>
                    </button>
                  </li>
                ))}
                {filteredLoans.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-neutral-500">
                    {t('noLoansForCustomer')}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Step 2: Payment */}
          {currentStep === 2 && selectedLoan && (
            <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-6 space-y-5">
              <h3 className="text-lg font-semibold text-neutral-900">
                {t('enterPayment')}
              </h3>
              <CurrencyInput
                label={t('cashReceivedRequired')}
                value={form.amount}
                onChange={(amount) => setForm((f) => ({ ...f, amount }))}
              />
              {isFixedInstallmentLoan(selectedLoan) && computation.fixedDueSummary && (
                <div className="flex flex-wrap gap-2">
                  <QuickAmount
                    label={`${t('totalDue')} ${formatLKR(computation.fixedDueSummary.totalDue)}`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        amount: Math.max(
                          0,
                          computation.fixedDueSummary!.totalDue -
                            (f.discountAmount ?? 0)
                        ),
                      }))
                    }
                  />
                  <QuickAmount
                    label={`${t('current')} ${formatLKR(computation.fixedDueSummary.currentMonthDue)}`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        amount: Math.max(
                          0,
                          computation.fixedDueSummary!.currentMonthDue -
                            (f.discountAmount ?? 0)
                        ),
                      }))
                    }
                  />
                  {selectedLoan.balanceAmount > 0 && (
                    <QuickAmount
                      label={`${t('fullLoanBalance')} ${formatLKR(selectedLoan.balanceAmount)}`}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          amount: Math.max(
                            0,
                            selectedLoan.balanceAmount - (f.discountAmount ?? 0)
                          ),
                        }))
                      }
                    />
                  )}
                </div>
              )}
              {isInterestOnlyLoan(selectedLoan) && (
                <div className="flex flex-wrap gap-2">
                  <QuickAmount
                    label={`${t('totalDue')} ${formatLKR(computation.interestOnlySummary?.totalInterestDue ?? 0)}`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        amount: Math.max(
                          0,
                          (computation.interestOnlySummary?.totalInterestDue ?? 0) -
                            (f.discountAmount ?? 0)
                        ),
                      }))
                    }
                  />
                  <QuickAmount
                    label={`${t('currentCycle')} ${formatLKR(computation.interestOnlySummary?.currentCycleInterestDue ?? 0)}`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        amount: Math.max(
                          0,
                          (computation.interestOnlySummary?.currentCycleInterestDue ??
                            0) - (f.discountAmount ?? 0)
                        ),
                      }))
                    }
                  />
                </div>
              )}
              <CurrencyInput
                label={t('discountGivenOptional')}
                value={form.discountAmount ?? 0}
                onChange={(discountAmount) =>
                  setForm((f) => ({ ...f, discountAmount }))
                }
              />
              {(form.amount > 0 || (form.discountAmount ?? 0) > 0) && (
                <AppliedPreview
                  cash={form.amount}
                  discount={form.discountAmount ?? 0}
                  total={computation.appliedTotal}
                />
              )}
              <p className="text-xs text-neutral-500">
                {t('loanBalanceReducesHint')}
              </p>
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-1">
                  {t('paymentMethod')} *
                </label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      paymentMethod: e.target.value as PaymentMethod,
                    }))
                  }
                  className="block w-full rounded-md border-0 py-2 pl-3 ring-1 ring-inset ring-neutral-300 sm:text-sm bg-white"
                >
                  <option value="CASH">{t('statusCash')}</option>
                  <option value="CHEQUE">{t('statusCheque')}</option>
                  <option value="BANK_TRANSFER">{t('statusBankTransfer')}</option>
                  <option value="OTHER">{t('statusOther')}</option>
                </select>
              </div>
              {form.paymentMethod === 'CHEQUE' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-1">
                    {t('chequeNumber')} *
                  </label>
                  <input
                    type="text"
                    value={form.chequeNumber}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, chequeNumber: e.target.value }))
                    }
                    className="block w-full rounded-md border-0 py-2 px-3 ring-1 ring-inset ring-neutral-300 sm:text-sm"
                  />
                </div>
              )}
              {form.paymentMethod === 'BANK_TRANSFER' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-1">
                    {t('bankReference')} *
                  </label>
                  <input
                    type="text"
                    value={form.bankReference}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bankReference: e.target.value }))
                    }
                    className="block w-full rounded-md border-0 py-2 px-3 ring-1 ring-inset ring-neutral-300 sm:text-sm"
                  />
                </div>
              )}
              <DatePicker
                label={`${t('paymentDate')} *`}
                value={form.paymentDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paymentDate: e.target.value }))
                }
              />
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-1">
                  {t('field.notes')}
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={2}
                  className="block w-full rounded-md border-0 py-2 px-3 ring-1 ring-inset ring-neutral-300 sm:text-sm"
                />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && selectedLoan && computation.allocation && (
            <RecordPaymentReview loan={selectedLoan} computation={computation} />
          )}

          {/* Step 4: Confirm */}
          {currentStep === 4 && selectedLoan && (
            <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-neutral-900">
                {t('confirmPayment')}
              </h3>
              <p className="text-sm font-medium text-neutral-800 rounded-lg bg-brand-50 border border-brand-100 px-4 py-3">
                {form.paymentMethod === 'CASH'
                  ? `Confirm cash payment ${formatLKR(form.amount)}`
                  : `Confirm ${formatEnum(form.paymentMethod).toLowerCase()} payment ${formatLKR(form.amount)}`}
                {(form.discountAmount ?? 0) > 0 &&
                  ` with discount ${formatLKR(form.discountAmount ?? 0)}`}
                . Total applied: {formatLKR(computation.appliedTotal)}.
              </p>
              <dl className="divide-y divide-neutral-200 text-sm">
                <Row label={t('field.customer')} value={selectedCustomer?.name ?? '—'} />
                <Row label={t('field.loan')} value={selectedLoan.loanCode} />
                <Row label={t('cashReceived')} value={formatLKR(form.amount)} bold />
                {(form.discountAmount ?? 0) > 0 && (
                  <Row
                    label={t('discountGiven')}
                    value={formatLKR(form.discountAmount ?? 0)}
                  />
                )}
                <Row
                  label={t('totalApplied')}
                  value={formatLKR(computation.appliedTotal)}
                />
                <Row label={t('field.method')} value={formatEnum(form.paymentMethod)} />
                <Row label={t('field.date')} value={formatDate(form.paymentDate)} />
              </dl>
              {computation.receipt && (
                <ReceiptPreview
                  loan={selectedLoan}
                  receipt={computation.receipt}
                />
              )}
            </div>
          )}

          <NavButtons
            currentStep={currentStep}
            isLastStep={currentStep === STEPS.length - 1}
            canContinue={canContinue()}
            isSubmitting={isSubmitting}
            primaryLabel={primaryLabel()}
            onBack={handleBack}
            onNext={currentStep === STEPS.length - 1 ? handleConfirm : handleNext}
            t={t}
          />
        </div>

        <aside className="flex-1 min-w-0 lg:max-w-[40%] shrink-0 lg:sticky lg:top-24 lg:self-start">
          <SummaryPanel
            step={currentStep}
            customer={selectedCustomer}
            loan={selectedLoan}
            computation={computation}
            compactLivePreview={currentStep === 3}
          />
        </aside>
      </div>
    </div>
  );
}

function QuickAmount({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-600/20 hover:bg-brand-100"
    >
      {label}
    </button>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="py-2 flex justify-between gap-4">
      <dt className="text-neutral-500">{label}</dt>
      <dd
        className={`text-neutral-900 tabular-nums text-right ${bold ? 'font-bold text-brand-600' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}

function NavButtons({
  currentStep,
  isLastStep,
  canContinue,
  isSubmitting,
  primaryLabel,
  onBack,
  onNext,
  t,
}: {
  currentStep: number;
  isLastStep: boolean;
  canContinue: boolean;
  isSubmitting?: boolean;
  primaryLabel: string;
  onBack: () => void;
  onNext: () => void;
  t: (key: import('../../lib/i18n/simpleLabels').LabelKey) => string;
}) {
  const isConfirm = isLastStep;
  return (
    <div className="flex justify-between pt-2 gap-4">
      <button
        type="button"
        onClick={onBack}
        disabled={isSubmitting}
        className="text-sm font-semibold text-neutral-900 disabled:opacity-50"
      >
        {currentStep === 0 ? t('action.cancel') : t('action.back')}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canContinue || isSubmitting}
        className={`rounded-md px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed ${
          isConfirm
            ? 'bg-success-600 hover:bg-success-500 shadow-md min-w-[10rem]'
            : 'bg-brand-600 hover:bg-brand-500'
        }`}
      >
        {primaryLabel}
      </button>
    </div>
  );
}

function AppliedPreview({
  cash,
  discount,
  total,
}: {
  cash: number;
  discount: number;
  total: number;
}) {
  const { t } = useT();
  return (
    <div className="rounded-lg bg-neutral-50 ring-1 ring-neutral-200 p-4 text-sm space-y-2">
      <div className="flex justify-between gap-4">
        <span className="text-neutral-600">{t('cashReceived')}</span>
        <span className="font-medium tabular-nums">{formatLKR(cash)}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between gap-4">
          <span className="text-neutral-600">{t('discountGiven')}</span>
          <span className="font-medium tabular-nums">{formatLKR(discount)}</span>
        </div>
      )}
      <div className="flex justify-between gap-4 border-t border-neutral-200 pt-2">
        <span className="font-medium text-neutral-900">{t('totalApplied')}</span>
        <span className="font-bold text-brand-600 tabular-nums">
          {formatLKR(total)}
        </span>
      </div>
    </div>
  );
}

function SummaryPanel({
  step,
  customer,
  loan,
  computation,
  compactLivePreview = false,
}: {
  step: number;
  customer: Customer | null | undefined;
  loan: Loan | null | undefined;
  computation: ReturnType<typeof usePaymentComputation>;
  compactLivePreview?: boolean;
}) {
  const { t } = useT();
  if (!loan) {
    return (
      <div className="rounded-xl bg-neutral-100 p-6 text-sm text-neutral-600">
        {t('paymentSummaryEmpty')}
      </div>
    );
  }

  const isIO = isInterestOnlyLoan(loan);
  const isFixed = isFixedInstallmentLoan(loan);

  return (
    <div className="rounded-xl bg-brand-800 text-white shadow-lg">
      <div className="p-6 border-b border-brand-700">
        <h3 className="text-lg font-medium text-brand-50">{t('paymentSummary')}</h3>
        {customer && (
          <p className="mt-1 text-sm text-brand-200">{customer.name}</p>
        )}
        <p className="text-sm font-mono text-brand-100 tabular-nums">
          {loan.loanCode}
        </p>
      </div>
      <div className="p-6 space-y-3 text-sm">
        {!compactLivePreview && isIO && (
          <>
            <SummaryLine
              label={t('loanAmount')}
              value={formatLKR(loan.principalAmount)}
            />
            <SummaryLine label={t('paid')} value={formatLKR(loan.paidAmount)} />
            <SummaryLine label={t('field.balance')} value={formatLKR(loan.balanceAmount)} />
            <SummaryLine
              label={t('nextDue')}
              value={
                computation.paymentNextDue?.dueDate
                  ? formatDate(computation.paymentNextDue.dueDate)
                  : computation.paymentNextDue?.label ?? '—'
              }
            />
          </>
        )}
        {!compactLivePreview && isFixed && (
          <>
            <SummaryLine
              label={
                loan.loanPurpose === 'BIKE_INSTALLMENT'
                  ? t('financeAmount')
                  : t('loanAmount')
              }
              value={formatLKR(loan.principalAmount)}
            />
            <SummaryLine
              label={t('totalPayable')}
              value={formatLKR(loan.totalPayable ?? 0)}
            />
            <SummaryLine label={t('paid')} value={formatLKR(loan.paidAmount)} />
            <SummaryLine label={t('field.balance')} value={formatLKR(loan.balanceAmount)} />
            {loan.installmentAmount != null && loan.installmentAmount > 0 && (
              <SummaryLine
                label={t('monthlyInstallment')}
                value={formatLKR(loan.installmentAmount)}
              />
            )}
            <SummaryLine
              label={t('nextDueDate')}
              value={
                computation.paymentNextDue?.dueDate
                  ? formatDate(computation.paymentNextDue.dueDate)
                  : computation.paymentNextDue?.label ?? '—'
              }
            />
            <SummaryLine
              label={t('lateFeeRate')}
              value={`${loan.lateFeeRate}%`}
            />
            {computation.fixedDueSummary && (
              <>
                <div className="pt-3 border-t border-brand-700" />
                <SummaryLine
                  label={t('lateFeesDue')}
                  value={formatLKR(computation.fixedDueSummary.totalLateFeesDue)}
                />
                <SummaryLine
                  label={t('arrearsInstallments')}
                  value={formatLKR(
                    computation.fixedDueSummary.totalArrearsInstallmentsDue
                  )}
                />
                <SummaryLine
                  label={t('currentMonth')}
                  value={formatLKR(computation.fixedDueSummary.currentMonthDue)}
                />
                <SummaryLine
                  label={t('totalDueToday')}
                  value={formatLKR(computation.fixedDueSummary.totalDue)}
                  highlight
                />
              </>
            )}
          </>
        )}
        {step >= 2 && computation.appliedTotal > 0 && computation.allocation && (
          <>
            <div className="pt-3 border-t border-brand-700" />
            <p className="text-xs uppercase tracking-wide text-brand-300">
              {compactLivePreview ? t('paymentImpact') : t('livePreview')}
            </p>
            {computation.receipt && 'cashReceived' in computation.receipt && (
              <>
                <SummaryLine
                  label={t('cashEntered')}
                  value={formatLKR(computation.receipt.cashReceived)}
                />
                {computation.receipt.discountApplied > 0 && (
                  <SummaryLine
                    label={t('discountApplied')}
                    value={formatLKR(computation.receipt.discountApplied)}
                  />
                )}
                <SummaryLine
                  label={t('totalApplied')}
                  value={formatLKR(computation.receipt.totalApplied)}
                  highlight={!compactLivePreview}
                />
              </>
            )}
            {compactLivePreview && computation.receipt && (
              <SummaryLine
                label={t('loanBalanceAfter')}
                value={formatLKR(
                  'loanBalance' in computation.receipt
                    ? computation.receipt.loanBalance
                    : computation.receipt.remainingPrincipal
                )}
                highlight
              />
            )}
            {!compactLivePreview &&
              isIO &&
              computation.receipt &&
              'interestPaid' in computation.receipt && (
              <>
                <SummaryLine
                  label={t('interestPaid')}
                  value={formatLKR(computation.receipt.interestPaid)}
                />
                <SummaryLine
                  label={t('principalPaid')}
                  value={formatLKR(computation.receipt.principalPaid)}
                />
                <SummaryLine
                  label={t('remainingPrincipal')}
                  value={formatLKR(computation.receipt.remainingPrincipal)}
                />
                <SummaryLine
                  label="Next est. interest"
                  value={formatLKR(computation.receipt.nextEstimatedInterest)}
                />
                {computation.receipt.pendingInterestRemaining > 0 && (
                  <SummaryLine
                    label={t('pendingInterest')}
                    value={formatLKR(
                      computation.receipt.pendingInterestRemaining
                    )}
                  />
                )}
              </>
            )}
            {!compactLivePreview &&
              isFixed &&
              computation.receipt &&
              'lateFeePaid' in computation.receipt && (
                <>
                  <SummaryLine
                    label={t('lateFeePaid')}
                    value={formatLKR(computation.receipt.lateFeePaid)}
                  />
                  <SummaryLine
                    label={t('installmentPaid')}
                    value={formatLKR(computation.receipt.installmentPaid)}
                  />
                  {computation.receipt.advancePaid > 0 && (
                    <SummaryLine
                      label={t('allocAdvance')}
                      value={formatLKR(computation.receipt.advancePaid)}
                    />
                  )}
                  <SummaryLine
                    label={t('arrearsRemaining')}
                    value={formatLKR(computation.receipt.remainingArrears)}
                  />
                  <SummaryLine
                    label="Balance after"
                    value={formatLKR(computation.receipt.loanBalance)}
                    highlight
                  />
                </>
              )}
          </>
        )}
      </div>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-brand-200">{label}</span>
      <span
        className={`tabular-nums text-right ${highlight ? 'font-bold text-white' : 'text-brand-50'}`}
      >
        {value}
      </span>
    </div>
  );
}

function ReceiptPreview({
  loan,
  receipt,
}: {
  loan: Loan;
  receipt: NonNullable<ReturnType<typeof usePaymentComputation>['receipt']>;
}) {
  const { t } = useT();
  return (
    <div className="rounded-lg bg-neutral-50 p-4 ring-1 ring-neutral-200 mt-4">
      <h4 className="text-sm font-semibold text-neutral-900 mb-3">
        {t('receiptPreview')}
      </h4>
      {isInterestOnlyLoan(loan) && 'interestPaid' in receipt && (
        <ul className="text-sm space-y-1 text-neutral-700">
          <li>{t('interestPaid')}: {formatLKR(receipt.interestPaid)}</li>
          <li>{t('principalPaid')}: {formatLKR(receipt.principalPaid)}</li>
          <li>{t('remainingPrincipal')}: {formatLKR(receipt.remainingPrincipal)}</li>
          {receipt.pendingInterestRemaining > 0 && (
            <li>
              {t('pendingInterest')}: {formatLKR(receipt.pendingInterestRemaining)}
            </li>
          )}
        </ul>
      )}
      {isFixedInstallmentLoan(loan) && 'lateFeePaid' in receipt && (
        <ul className="text-sm space-y-1 text-neutral-700">
          <li>{t('lateFeePaid')}: {formatLKR(receipt.lateFeePaid)}</li>
          <li>{t('installmentPaid')}: {formatLKR(receipt.installmentPaid)}</li>
          {receipt.advancePaid > 0 && (
            <li>{t('advancePaid')}: {formatLKR(receipt.advancePaid)}</li>
          )}
          <li>{t('remainingArrears')}: {formatLKR(receipt.remainingArrears)}</li>
          <li>{t('loanBalance')}: {formatLKR(receipt.loanBalance)}</li>
        </ul>
      )}
    </div>
  );
}
