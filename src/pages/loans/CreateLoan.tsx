import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/ui/PageHeader';
import { CustomerSearchSelect } from '../../components/customers/CustomerSearchSelect';
import { Stepper } from '../../components/ui/Stepper';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { DatePicker } from '../../components/ui/DatePicker';
import type { LoanPurpose, RepaymentMethod } from '../../types/loan';
import { defaultRepaymentMethod } from '../../types/loan';
import {
  calculateFixedInstallmentTotals,
  calculateLateFeePerMonth,
} from '../../lib/finance/fixedInstallment';
import { parsePercentInput, sanitizePercentInput } from '../../lib/finance/parsePercent';
import { DEFAULT_LATE_FEE_RATE_PERCENT } from '../../lib/finance/constants';
import { computeFirstDueDate } from '../../lib/finance/dueDates';
import { calculateMonthlyInterestDue } from '../../lib/finance/interestOnly';
import { formatLKR, formatEnum } from '../../lib/format';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import {
  createLoan,
  listCustomers,
  listInStockBikes,
} from '../../lib/local-db/repositories';
import {
  emptyGuaranteeDraft,
  mapGuaranteeDraftsToCreate,
  type LocalGuaranteeDraft,
} from '../../lib/guarantee/guaranteeFields';
import { BikeSearchSelect } from '../../components/bikes/BikeSearchSelect';
import { GuaranteeFieldsForm } from '../../components/guarantees/GuaranteeFieldsForm';
import { GuaranteeDraftSummary } from '../../components/guarantees/GuaranteeDraftSummary';
import { formatBikeSelectLabel } from '../../lib/display/bikeDisplay';
import { useT } from '../../i18n/I18nProvider';
import {
  computeOriginationFees,
  validateOriginationFees,
} from '../../lib/finance/loanOriginationFees';
import { LoanOriginationSummaryCard } from '../../components/loans/LoanOriginationSummaryCard';
import { LoanPaymentBreakdown } from '../../components/loans/LoanPaymentBreakdown';

export function CreateLoan() {
  const { t, tf } = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const steps = [
    { id: 'customer', label: t('stepCustomer') },
    { label: t('stepPurpose') },
    { label: t('stepMethod') },
    { label: t('stepTerms') },
    { label: t('stepBikeGuarantee') },
    { label: t('stepConfirm') },
  ];
  const db = useDemoDb();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const [customerId, setCustomerId] = useState('');
  const [loanPurpose, setLoanPurpose] = useState<LoanPurpose>('CASH_LOAN');
  const [repaymentMethod, setRepaymentMethod] = useState<RepaymentMethod>(
    'FIXED_TERM_INSTALLMENT'
  );

  const [loanAmount, setLoanAmount] = useState(0);
  const [monthlyInterestInput, setMonthlyInterestInput] = useState('5');
  const [financeAmount, setFinanceAmount] = useState(0);
  const [termMonths, setTermMonths] = useState(36);
  const [monthlyFlatInput, setMonthlyFlatInput] = useState('2.5');
  const [lateFeeInput, setLateFeeInput] = useState(
    String(DEFAULT_LATE_FEE_RATE_PERCENT)
  );
  const [discountAmount, setDiscountAmount] = useState(0);

  const [guaranteeDrafts, setGuaranteeDrafts] = useState<LocalGuaranteeDraft[]>(
    []
  );

  const monthlyInterestRate = parsePercentInput(monthlyInterestInput);
  const monthlyFlatRate = parsePercentInput(monthlyFlatInput);
  const lateFeeRate = parsePercentInput(lateFeeInput);

  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [firstDueDate, setFirstDueDate] = useState('');

  const [bikeId, setBikeId] = useState('');
  const [sellingPrice, setSellingPrice] = useState(0);
  const [initialPayment, setInitialPayment] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [registrationFee, setRegistrationFee] = useState(0);

  const customers = listCustomers(db);
  const bikes = listInStockBikes(db);

  const isInterestOnly =
    repaymentMethod === 'INTEREST_ONLY_REDUCING_PRINCIPAL';
  const isBike = loanPurpose === 'BIKE_INSTALLMENT';

  useEffect(() => {
    if (isBike && repaymentMethod !== 'FIXED_TERM_INSTALLMENT') {
      setRepaymentMethod('FIXED_TERM_INSTALLMENT');
    }
  }, [isBike, repaymentMethod]);

  useEffect(() => {
    const prefill = searchParams.get('customerId');
    if (prefill) setCustomerId(prefill);
  }, [searchParams]);

  const effectiveFinanceAmount = useMemo(() => {
    if (isBike) return sellingPrice;
    return isInterestOnly ? loanAmount : financeAmount;
  }, [isBike, isInterestOnly, sellingPrice, loanAmount, financeAmount]);

  const loanPrincipalAmount = effectiveFinanceAmount || 0;

  const origination = useMemo(
    () =>
      computeOriginationFees(
        {
          initialPayment,
          serviceFee,
          registrationFee,
        },
        loanPrincipalAmount
      ),
    [initialPayment, serviceFee, registrationFee, loanPrincipalAmount]
  );

  const interestOnlyCalc = useMemo(() => {
    const principal = origination.financedPrincipal;
    const monthlyInterestDue = calculateMonthlyInterestDue(
      principal,
      monthlyInterestRate || 0
    );
    return { principal, monthlyInterestDue };
  }, [origination.financedPrincipal, monthlyInterestRate]);

  const fixedCalc = useMemo(
    () =>
      calculateFixedInstallmentTotals({
        financeAmount: origination.financedPrincipal,
        termMonths: termMonths || 1,
        monthlyFlatRatePercent: monthlyFlatRate || 0,
        discountAmount,
      }),
    [
      origination.financedPrincipal,
      termMonths,
      monthlyFlatRate,
      discountAmount,
    ]
  );

  const lateFeePerMonth = useMemo(
    () =>
      fixedCalc.monthlyInstallment > 0
        ? calculateLateFeePerMonth(fixedCalc.monthlyInstallment, lateFeeRate || 0)
        : 0,
    [fixedCalc.monthlyInstallment, lateFeeRate]
  );

  const handlePurposeChange = (purpose: LoanPurpose) => {
    setLoanPurpose(purpose);
    if (purpose === 'BIKE_INSTALLMENT') {
      setRepaymentMethod('FIXED_TERM_INSTALLMENT');
      return;
    }
    const defaultMethod = defaultRepaymentMethod(purpose);
    if (defaultMethod) setRepaymentMethod(defaultMethod);
  };

  const handleBikeSelect = (id: string) => {
    setBikeId(id);
    const bike = bikes.find((b) => b.id === id);
    if (bike) setSellingPrice(bike.sellingPrice || bike.price);
  };

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    if (date) setFirstDueDate(computeFirstDueDate(date));
  };

  const handleNext = () => {
    const err = ((): string | null => {
      if (currentStep === 0 && !customerId) return t('selectCustomerRequired');
      if (currentStep === 3 && isInterestOnly) {
        if (!isBike && (!loanAmount || loanAmount <= 0))
          return t('enterLoanAmount');
      }
      if (currentStep === 3 && !isInterestOnly) {
        if (!isBike && (!financeAmount || financeAmount <= 0))
          return t('enterFinanceAmount');
        if (!termMonths || termMonths < 1) return t('enterValidTerm');
        if (!firstDueDate) return t('setFirstDueDate');
      }
      if (currentStep === 3 && isBike && !bikeId) {
        return t('selectInStockBikeInstallment');
      }
      if (currentStep === 3 && isBike && sellingPrice <= 0) {
        return t('enterBikeSellingPrice');
      }
      if (currentStep === 4 && isBike && !bikeId)
        return t('selectInStockBikeInstallment');
      if (currentStep === steps.length - 1) {
        if (!customerId) return t('selectCustomerRequired');
        if (isBike && !bikeId) return t('selectBikeBeforeConfirm');
        if (!effectiveFinanceAmount || effectiveFinanceAmount <= 0)
          return t('financeAmountGreaterThanZero');
        const feeErr = validateOriginationFees(
          {
            initialPayment: origination.initialPayment,
            serviceFee: origination.serviceFee,
            registrationFee: origination.registrationFee,
          },
          loanPrincipalAmount
        );
        if (feeErr) return t(feeErr);
      }
      return null;
    })();

    if (err) {
      showToast(err, 'error');
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      return;
    }

    if (!customerId || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const loan = createLoan(
        {
          customerId,
          loanPurpose,
          repaymentMethod,
          principalAmount: effectiveFinanceAmount,
          interestRate: isInterestOnly ? monthlyInterestRate : monthlyFlatRate,
          termMonths: isInterestOnly ? undefined : termMonths,
          lateFeeRate: isInterestOnly ? 0 : lateFeeRate,
          discountAmount,
          startDate,
          firstDueDate:
            firstDueDate ||
            computeFirstDueDate(startDate),
          bikeId: isBike ? bikeId : undefined,
          initialPayment: origination.initialPayment,
          serviceFee: origination.serviceFee,
          registrationFee: origination.registrationFee,
          guarantees: mapGuaranteeDraftsToCreate(guaranteeDrafts),
        },
        db
      );
      showToast(`${t('loanCreated')}: ${loan.loanCode}`, 'success');
      navigate(`/loans/${loan.id}`, { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('loanCreateFailed');
      showToast(message, 'error');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (isSubmitting) return;
    if (currentStep > 0) setCurrentStep(currentStep - 1);
    else navigate('/loans');
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title={t('createLoan')} subtitle={t('createLoanSubtitle')} />

      <div className="mb-8 w-full">
        <Stepper steps={steps} current={currentStep} />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start gap-8">
        <div className="flex-1 min-w-0 lg:max-w-[60%] flex flex-col">
          <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-lg p-6 mb-6 flex-1 flex flex-col min-h-[min(480px,55vh)]">
            <div className="flex-1">
            {currentStep === 0 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-neutral-900">
                  {t('selectCustomer')}
                </h3>
                <CustomerSearchSelect
                  customers={customers}
                  selectedCustomerId={customerId || null}
                  onSelect={(id) => setCustomerId(id ?? '')}
                />
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-900">
                  {t('loanPurpose')}
                </h3>
                {(
                  [
                    ['CASH_LOAN', t('cashLoan')],
                    ['BIKE_INSTALLMENT', t('bikeInstallment')],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      checked={loanPurpose === value}
                      onChange={() => handlePurposeChange(value)}
                      className="h-4 w-4 text-brand-600"
                    />
                    <span className="text-sm text-neutral-900">{label}</span>
                  </label>
                ))}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-900">
                  {t('repaymentMethod')}
                </h3>
                {isBike ? (
                  <div className="rounded-lg bg-brand-50 ring-1 ring-brand-200 p-4 space-y-2">
                    <p className="text-sm font-semibold text-brand-900">
                      {t('fixedMonthlyInstallments')}
                    </p>
                    <p className="text-sm text-brand-800">
                      {t('bikeInstallmentFixedHint')}
                    </p>
                  </div>
                ) : (
                  (
                    [
                      [
                        'INTEREST_ONLY_REDUCING_PRINCIPAL',
                        t('monthlyInterestReducing'),
                      ],
                      ['FIXED_TERM_INSTALLMENT', t('fixedTermInstallment')],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        checked={repaymentMethod === value}
                        onChange={() => setRepaymentMethod(value)}
                        className="h-4 w-4 text-brand-600"
                      />
                      <span className="text-sm text-neutral-900">{label}</span>
                    </label>
                  ))
                )}
              </div>
            )}

            {currentStep === 3 && isInterestOnly && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-900">
                  {t('interestOnlyTerms')}
                </h3>
                <CurrencyInput
                  label={`${t('loanAmountField')} *`}
                  value={isBike ? effectiveFinanceAmount : loanAmount}
                  onChange={(v) => !isBike && setLoanAmount(v)}
                  placeholder="e.g. 100,000"
                  disabled={isBike}
                />
                <LoanPaymentBreakdown
                  initialPayment={origination.initialPayment}
                  serviceFee={origination.serviceFee}
                  registrationFee={origination.registrationFee}
                  netAdvancePayment={origination.netAdvancePayment}
                  financedPrincipal={origination.financedPrincipal}
                >
                  <CurrencyInput
                    label={t('initialPayment')}
                    value={initialPayment}
                    onChange={setInitialPayment}
                  />
                  <CurrencyInput
                    label={t('serviceFee')}
                    value={serviceFee}
                    onChange={setServiceFee}
                  />
                  <CurrencyInput
                    label={t('registrationFee')}
                    value={registrationFee}
                    onChange={setRegistrationFee}
                  />
                </LoanPaymentBreakdown>
                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-1">
                    {t('monthlyInterestRate')} *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={monthlyInterestInput}
                    onChange={(e) =>
                      setMonthlyInterestInput(sanitizePercentInput(e.target.value))
                    }
                    autoComplete="off"
                    className="block w-full rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm tabular-nums"
                  />
                </div>
                <DatePicker
                  label={`${t('startDate')} *`}
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                />
                <p className="text-sm text-info-700 bg-info-50 rounded-md p-3">
                  {t('guaranteeRequiredHint')}
                </p>
              </div>
            )}

            {currentStep === 3 && !isInterestOnly && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-900">
                  {isBike ? t('bikeInstallmentTerms') : t('fixedInstallmentTerms')}
                </h3>
                {isBike && (
                  <div className="space-y-4 pb-6 border-b border-neutral-200">
                    <BikeSearchSelect
                      bikes={bikes}
                      selectedBikeId={bikeId || null}
                      onSelect={(id) => handleBikeSelect(id ?? '')}
                      placeholder={t('selectInStockBike')}
                    />
                    <CurrencyInput
                      label={`${t('loanAmountField')} *`}
                      value={sellingPrice}
                      onChange={setSellingPrice}
                    />
                  </div>
                )}
                {!isBike && (
                  <CurrencyInput
                    label={`${t('financeAmount')} *`}
                    value={effectiveFinanceAmount}
                    onChange={setFinanceAmount}
                  />
                )}
                <LoanPaymentBreakdown
                  initialPayment={origination.initialPayment}
                  serviceFee={origination.serviceFee}
                  registrationFee={origination.registrationFee}
                  netAdvancePayment={origination.netAdvancePayment}
                  financedPrincipal={origination.financedPrincipal}
                >
                  <CurrencyInput
                    label={t('initialPayment')}
                    value={initialPayment}
                    onChange={setInitialPayment}
                  />
                  <CurrencyInput
                    label={t('serviceFee')}
                    value={serviceFee}
                    onChange={setServiceFee}
                  />
                  <CurrencyInput
                    label={t('registrationFee')}
                    value={registrationFee}
                    onChange={setRegistrationFee}
                  />
                </LoanPaymentBreakdown>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-900 mb-1">
                      {t('termMonths')} *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={termMonths}
                      onChange={(e) =>
                        setTermMonths(parseInt(e.target.value, 10) || 0)
                      }
                      className="block w-full rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 sm:text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-900 mb-1">
                      {t('monthlyFlatRate')} *
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={monthlyFlatInput}
                      onChange={(e) =>
                        setMonthlyFlatInput(sanitizePercentInput(e.target.value))
                      }
                      autoComplete="off"
                      className="block w-full rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 sm:text-sm tabular-nums"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-1">
                    {t('lateFeeRateField')} *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={lateFeeInput}
                    onChange={(e) =>
                      setLateFeeInput(sanitizePercentInput(e.target.value))
                    }
                    autoComplete="off"
                    className="block w-full rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 sm:text-sm tabular-nums"
                  />
                </div>
                <CurrencyInput
                  label={t('discountOptional')}
                  value={discountAmount}
                  onChange={setDiscountAmount}
                />
                <DatePicker
                  label={`${t('startDate')} *`}
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                />
                <DatePicker
                  label={`${t('firstDueDate')} *`}
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                />
                <p className="text-xs text-neutral-500">
                  {tf('defaultLateFeeHint', { rate: DEFAULT_LATE_FEE_RATE_PERCENT })}
                </p>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-8">
                {isBike && bikeId && (
                  <div className="rounded-lg bg-neutral-50 ring-1 ring-neutral-200 p-4 text-sm space-y-1">
                    <p className="font-semibold text-neutral-900">{t('selectedBikeLabel')}</p>
                    <p>
                      {(() => {
                        const b = bikes.find((x) => x.id === bikeId);
                        return b
                          ? formatBikeSelectLabel(b, t('notRegistered'))
                          : '—';
                      })()}
                    </p>
                    <p>
                      {t('loanAmountField')}: {formatLKR(sellingPrice)} ·{' '}
                      {t('financedPrincipal')}: {formatLKR(origination.financedPrincipal)}
                    </p>
                  </div>
                )}
                {isBike && !bikeId && (
                  <p className="text-sm text-danger-700 bg-danger-50 rounded-md p-3">
                    Go back to Terms and select an in-stock bike before continuing.
                  </p>
                )}

                <div className="rounded-xl bg-neutral-50 ring-1 ring-neutral-200 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-medium text-neutral-900">
                      {t('guaranteeItems')}
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        setGuaranteeDrafts((prev) => [
                          ...prev,
                          emptyGuaranteeDraft(),
                        ])
                      }
                      className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500"
                    >
                      {t('addAnotherGuarantee')}
                    </button>
                  </div>
                  <p className="text-sm text-neutral-600">
                    {t('guaranteeOptionalHint')}
                  </p>

                  {guaranteeDrafts.length === 0 && (
                    <p className="text-sm text-neutral-500 italic">
                      {t('noGuaranteeItemsHint')}
                    </p>
                  )}

                  <ul className="space-y-4">
                    {guaranteeDrafts.map((g, idx) => (
                      <li
                        key={g.key}
                        className="rounded-lg bg-white p-4 ring-1 ring-neutral-200 shadow-sm space-y-3"
                      >
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-sm font-semibold text-neutral-800">
                            Item {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setGuaranteeDrafts((prev) =>
                                prev.filter((x) => x.key !== g.key)
                              )
                            }
                            className="text-xs font-semibold text-danger-700 hover:text-danger-900"
                          >
                            Remove
                          </button>
                        </div>
                        <GuaranteeFieldsForm
                          values={g}
                          onChange={(patch) =>
                            setGuaranteeDrafts((prev) =>
                              prev.map((x) =>
                                x.key === g.key ? { ...x, ...patch } : x
                              )
                            )
                          }
                        />
                        <GuaranteeDraftSummary
                          draft={g}
                          linkedBike={
                            isBike && bikeId
                              ? bikes.find((b) => b.id === bikeId)
                              : null
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-900">{t('stepReview')}</h3>
                <dl className="divide-y divide-neutral-200 text-sm">
                  <div className="py-2 flex justify-between">
                    <dt className="text-neutral-500">{t('field.customer')}</dt>
                    <dd>
                      {customers.find((c) => c.id === customerId)?.name ?? '—'}
                    </dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-neutral-500">{t('stepPurpose')}</dt>
                    <dd>{formatEnum(loanPurpose)}</dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-neutral-500">{t('stepMethod')}</dt>
                    <dd>{formatEnum(repaymentMethod)}</dd>
                  </div>
                </dl>
              </div>
            )}
            </div>
          </div>

          <div className="flex justify-between shrink-0">
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="text-sm font-semibold text-neutral-900 disabled:opacity-50"
            >
              {currentStep === 0 ? t('action.cancel') : t('action.back')}
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 min-w-[8rem]"
            >
              {isSubmitting
                ? t('creatingLoan')
                : currentStep === steps.length - 1
                  ? t('confirmLoan')
                  : t('action.next')}
            </button>
          </div>
        </div>

        <div className="flex-1 lg:max-w-[40%] w-full lg:self-start">
          <div className="lg:sticky lg:top-24 max-h-[calc(100vh-6rem)] overflow-y-auto lg:pr-1">
            <div className="bg-brand-800 rounded-xl shadow-lg text-white p-6">
            <h3 className="text-lg font-medium mb-4 text-brand-50">
              {t('calculation')}
            </h3>
            {isInterestOnly ? (
              <LoanOriginationSummaryCard
                loanAmount={loanPrincipalAmount}
                initialPayment={origination.initialPayment}
                serviceFee={origination.serviceFee}
                registrationFee={origination.registrationFee}
                netAdvancePayment={origination.netAdvancePayment}
                financedPrincipal={origination.financedPrincipal}
                interestAmount={interestOnlyCalc.monthlyInterestDue}
              />
            ) : (
              <LoanOriginationSummaryCard
                loanAmount={loanPrincipalAmount}
                initialPayment={origination.initialPayment}
                serviceFee={origination.serviceFee}
                registrationFee={origination.registrationFee}
                netAdvancePayment={origination.netAdvancePayment}
                financedPrincipal={origination.financedPrincipal}
                interestAmount={fixedCalc.totalInterest}
                totalPayable={fixedCalc.totalPayable}
                monthlyInstallment={fixedCalc.monthlyInstallment}
              >
                <dl className="space-y-3 text-sm pt-2 border-t border-brand-700">
                  <div className="flex justify-between">
                    <dt className="text-brand-200">{t('lateFeePerMonthOverdue')}</dt>
                    <dd className="tabular-nums">{formatLKR(lateFeePerMonth)}</dd>
                  </div>
                </dl>
              </LoanOriginationSummaryCard>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
