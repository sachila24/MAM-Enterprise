import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  calculateBikeFinanceAmount,
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
import type { CreateGuaranteeDraft } from '../../lib/local-db/repositories/loansRepo';
import { useT } from '../../i18n/I18nProvider';
import { uiError } from '../../lib/i18n/messages';

type LocalGuaranteeDraft = {
  key: string;
  itemType: 'VEHICLE_BOOK' | 'BIKE' | 'OTHER';
  itemReference: string;
  ownerNameOnDocument: string;
  description: string;
  storageLocation: string;
  receivedDate: string;
  notes: string;
};

function isGuaranteeDraftStarted(g: LocalGuaranteeDraft): boolean {
  return (
    g.description.trim() !== '' ||
    g.storageLocation.trim() !== '' ||
    g.itemReference.trim() !== '' ||
    g.ownerNameOnDocument.trim() !== '' ||
    g.notes.trim() !== ''
  );
}

function validateGuaranteeDrafts(drafts: LocalGuaranteeDraft[]): string | null {
  for (let i = 0; i < drafts.length; i++) {
    const g = drafts[i];
    if (!isGuaranteeDraftStarted(g)) continue;
    if (!g.description.trim()) {
      return uiError('guaranteeDescRequired', { n: String(i + 1) });
    }
    if (!g.storageLocation.trim()) {
      return uiError('guaranteeStorageRequired', { n: String(i + 1) });
    }
    if (!g.receivedDate) {
      return uiError('guaranteeDateRequired', { n: String(i + 1) });
    }
  }
  return null;
}

function mapCompleteGuarantees(
  drafts: LocalGuaranteeDraft[]
): CreateGuaranteeDraft[] {
  return drafts
    .filter(
      (g) =>
        g.description.trim() &&
        g.storageLocation.trim() &&
        g.receivedDate
    )
    .map((g) => ({
      itemType: g.itemType,
      itemReference: g.itemReference.trim() || undefined,
      ownerNameOnDocument: g.ownerNameOnDocument.trim() || undefined,
      description: g.description.trim(),
      storageLocation: g.storageLocation.trim(),
      receivedDate: g.receivedDate,
      notes: g.notes.trim() || undefined,
    }));
}

export function CreateLoan() {
  const { t } = useT();
  const navigate = useNavigate();
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
  const [dueDay, setDueDay] = useState(1);

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
  const [downPayment, setDownPayment] = useState(0);

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

  const effectiveFinanceAmount = useMemo(() => {
    if (isBike) {
      return calculateBikeFinanceAmount(sellingPrice, downPayment);
    }
    return isInterestOnly ? loanAmount : financeAmount;
  }, [isBike, isInterestOnly, sellingPrice, downPayment, loanAmount, financeAmount]);

  const interestOnlyCalc = useMemo(() => {
    const principal = effectiveFinanceAmount || 0;
    const monthlyInterestDue = calculateMonthlyInterestDue(
      principal,
      monthlyInterestRate || 0
    );
    return { principal, monthlyInterestDue };
  }, [effectiveFinanceAmount, monthlyInterestRate]);

  const fixedCalc = useMemo(
    () =>
      calculateFixedInstallmentTotals({
        financeAmount: effectiveFinanceAmount || 0,
        termMonths: termMonths || 1,
        monthlyFlatRatePercent: monthlyFlatRate || 0,
        discountAmount,
      }),
    [effectiveFinanceAmount, termMonths, monthlyFlatRate, discountAmount]
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
        if (!firstDueDate) return t('setFirstDueDate');
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
      if (currentStep >= 4) {
        const gErr = validateGuaranteeDrafts(guaranteeDrafts);
        if (gErr) return gErr;
      }
      if (currentStep === 4 && isBike && !bikeId)
        return t('selectInStockBikeInstallment');
      if (currentStep === steps.length - 1) {
        if (!customerId) return t('selectCustomerRequired');
        if (isBike && !bikeId) return t('selectBikeBeforeConfirm');
        if (!effectiveFinanceAmount || effectiveFinanceAmount <= 0)
          return t('financeAmountGreaterThanZero');
        const gErr = validateGuaranteeDrafts(guaranteeDrafts);
        if (gErr) return gErr;
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
          firstDueDate: firstDueDate || computeFirstDueDate(startDate),
          dueDay: isInterestOnly ? dueDay : undefined,
          bikeId: isBike ? bikeId : undefined,
          guarantees: mapCompleteGuarantees(guaranteeDrafts),
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
                      Bike installment uses fixed-term leasing: equal monthly
                      payments over the selected term. Interest-only repayment is
                      not available for bike sales.
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
                  Interest-Only Terms
                </h3>
                <CurrencyInput
                  label="Loan amount *"
                  value={isBike ? effectiveFinanceAmount : loanAmount}
                  onChange={(v) => !isBike && setLoanAmount(v)}
                  placeholder="e.g. 100,000"
                  disabled={isBike}
                />
                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-1">
                    Monthly interest rate (%) *
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
                  label="Start date *"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-1">
                    Due day (1–28) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={dueDay}
                    onChange={(e) => setDueDay(parseInt(e.target.value, 10) || 1)}
                    className="block w-full rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 sm:text-sm tabular-nums"
                  />
                </div>
                <DatePicker
                  label="First due date *"
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                />
                <p className="text-xs text-neutral-500">
                  Same day each month (e.g. start May 15 → first due June 15).
                </p>
                <p className="text-sm text-info-700 bg-info-50 rounded-md p-3">
                  {t('guaranteeRequiredHint')}
                </p>
              </div>
            )}

            {currentStep === 3 && !isInterestOnly && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-900">
                  {isBike ? 'Bike & installment terms' : 'Fixed Installment Terms'}
                </h3>
                {isBike && (
                  <div className="space-y-4 pb-6 border-b border-neutral-200">
                    <select
                      value={bikeId}
                      onChange={(e) => handleBikeSelect(e.target.value)}
                      className="block w-full rounded-md border-0 py-1.5 pl-3 ring-1 ring-inset ring-neutral-300 sm:text-sm bg-white"
                    >
                      <option value="">-- Select in-stock bike --</option>
                      {bikes.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bikeCode} · {b.model} — {b.engineNo}
                        </option>
                      ))}
                    </select>
                    <CurrencyInput
                      label="Bike selling price *"
                      value={sellingPrice}
                      onChange={setSellingPrice}
                    />
                    <CurrencyInput
                      label="Down payment *"
                      value={downPayment}
                      onChange={setDownPayment}
                    />
                    <p className="text-sm text-neutral-600">
                      Finance amount:{' '}
                      <strong>{formatLKR(effectiveFinanceAmount)}</strong>
                    </p>
                  </div>
                )}
                <CurrencyInput
                  label="Finance amount *"
                  value={effectiveFinanceAmount}
                  onChange={(v) => !isBike && setFinanceAmount(v)}
                  disabled={isBike}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-900 mb-1">
                      Term (months) *
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
                      Monthly flat rate (%) *
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
                    Late fee rate (%) *
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
                  label="Discount (optional)"
                  value={discountAmount}
                  onChange={setDiscountAmount}
                />
                <DatePicker
                  label="Start date *"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                />
                <DatePicker
                  label="First due date *"
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                />
                <p className="text-xs text-neutral-500">
                  Default late fee {DEFAULT_LATE_FEE_RATE_PERCENT}%. Owner may change later.
                </p>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-8">
                {isBike && bikeId && (
                  <div className="rounded-lg bg-neutral-50 ring-1 ring-neutral-200 p-4 text-sm space-y-1">
                    <p className="font-semibold text-neutral-900">Selected bike</p>
                    <p>
                      {bikes.find((b) => b.id === bikeId)?.bikeCode ?? '—'} ·{' '}
                      {bikes.find((b) => b.id === bikeId)?.model ?? '—'}
                    </p>
                    <p>
                      Selling {formatLKR(sellingPrice)} · Down{' '}
                      {formatLKR(downPayment)} · Finance{' '}
                      {formatLKR(effectiveFinanceAmount)}
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
                      Guarantee items
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        setGuaranteeDrafts((prev) => [
                          ...prev,
                          {
                            key: crypto.randomUUID(),
                            itemType: 'VEHICLE_BOOK',
                            itemReference: '',
                            ownerNameOnDocument: '',
                            description: '',
                            storageLocation: '',
                            receivedDate:
                              new Date().toISOString().split('T')[0],
                            notes: '',
                          },
                        ])
                      }
                      className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500"
                    >
                      Add another guarantee
                    </button>
                  </div>
                  <p className="text-sm text-neutral-600">
                    {isBike
                      ? 'Optional extra collateral in addition to the bike.'
                      : 'Add one or more guarantee items held by the shop.'}
                  </p>

                  {guaranteeDrafts.length === 0 && (
                    <p className="text-sm text-neutral-500 italic">
                      No items yet — use &quot;Add another guarantee&quot; to start.
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
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Guarantee type
                          </label>
                          <select
                            value={g.itemType}
                            onChange={(e) =>
                              setGuaranteeDrafts((prev) =>
                                prev.map((x) =>
                                  x.key === g.key
                                    ? {
                                        ...x,
                                        itemType: e.target.value as LocalGuaranteeDraft['itemType'],
                                      }
                                    : x
                                )
                              )
                            }
                            className="block w-full rounded-md border-0 py-1.5 pl-3 ring-1 ring-inset ring-neutral-300 text-sm bg-white"
                          >
                            <option value="VEHICLE_BOOK">Vehicle book</option>
                            <option value="BIKE">Bike</option>
                            <option value="OTHER">Other valuable item</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-1">
                              Vehicle number / item reference
                            </label>
                            <input
                              type="text"
                              value={g.itemReference}
                              onChange={(e) =>
                                setGuaranteeDrafts((prev) =>
                                  prev.map((x) =>
                                    x.key === g.key
                                      ? { ...x, itemReference: e.target.value }
                                      : x
                                  )
                                )
                              }
                              className="block w-full rounded-md border-0 py-1.5 px-2 ring-1 ring-inset ring-neutral-300 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-1">
                              Owner name on document
                            </label>
                            <input
                              type="text"
                              value={g.ownerNameOnDocument}
                              onChange={(e) =>
                                setGuaranteeDrafts((prev) =>
                                  prev.map((x) =>
                                    x.key === g.key
                                      ? {
                                          ...x,
                                          ownerNameOnDocument: e.target.value,
                                        }
                                      : x
                                  )
                                )
                              }
                              className="block w-full rounded-md border-0 py-1.5 px-2 ring-1 ring-inset ring-neutral-300 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Description *
                          </label>
                          <textarea
                            value={g.description}
                            onChange={(e) =>
                              setGuaranteeDrafts((prev) =>
                                prev.map((x) =>
                                  x.key === g.key
                                    ? { ...x, description: e.target.value }
                                    : x
                                )
                              )
                            }
                            rows={2}
                            className="block w-full rounded-md border-0 py-1.5 px-2 ring-1 ring-inset ring-neutral-300 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-1">
                              Storage location *
                            </label>
                            <input
                              type="text"
                              value={g.storageLocation}
                              onChange={(e) =>
                                setGuaranteeDrafts((prev) =>
                                  prev.map((x) =>
                                    x.key === g.key
                                      ? {
                                          ...x,
                                          storageLocation: e.target.value,
                                        }
                                      : x
                                  )
                                )
                              }
                              className="block w-full rounded-md border-0 py-1.5 px-2 ring-1 ring-inset ring-neutral-300 text-sm"
                            />
                          </div>
                          <DatePicker
                            label="Received date *"
                            value={g.receivedDate}
                            onChange={(e) =>
                              setGuaranteeDrafts((prev) =>
                                prev.map((x) =>
                                  x.key === g.key
                                    ? { ...x, receivedDate: e.target.value }
                                    : x
                                )
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Notes
                          </label>
                          <input
                            type="text"
                            value={g.notes}
                            onChange={(e) =>
                              setGuaranteeDrafts((prev) =>
                                prev.map((x) =>
                                  x.key === g.key
                                    ? { ...x, notes: e.target.value }
                                    : x
                                )
                              )
                            }
                            className="block w-full rounded-md border-0 py-1.5 px-2 ring-1 ring-inset ring-neutral-300 text-sm"
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-neutral-500">
                    Stored as Held when the loan is confirmed. Started rows must
                    include description, storage location, and received date.
                  </p>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-900">Review</h3>
                <dl className="divide-y divide-neutral-200 text-sm">
                  <div className="py-2 flex justify-between">
                    <dt className="text-neutral-500">Customer</dt>
                    <dd>
                      {customers.find((c) => c.id === customerId)?.name ?? '—'}
                    </dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-neutral-500">Purpose</dt>
                    <dd>{formatEnum(loanPurpose)}</dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-neutral-500">Method</dt>
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
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-brand-200">Current principal</dt>
                  <dd className="font-medium tabular-nums">
                    {formatLKR(interestOnlyCalc.principal)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-brand-200">Monthly interest due</dt>
                  <dd className="font-medium tabular-nums">
                    {formatLKR(interestOnlyCalc.monthlyInterestDue)}
                  </dd>
                </div>
                <div className="flex justify-between pt-3 border-t border-brand-700">
                  <dt className="text-brand-100">Principal balance</dt>
                  <dd className="text-xl font-bold tabular-nums">
                    {formatLKR(interestOnlyCalc.principal)}
                  </dd>
                </div>
              </dl>
            ) : (
              <dl className="space-y-3 text-sm">
                {isBike && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-brand-200">Selling price</dt>
                      <dd className="tabular-nums">{formatLKR(sellingPrice)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-brand-200">Down payment</dt>
                      <dd className="tabular-nums">{formatLKR(downPayment)}</dd>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <dt className="text-brand-200">Finance amount</dt>
                  <dd className="tabular-nums">{formatLKR(fixedCalc.financeAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-brand-200">Total interest</dt>
                  <dd className="tabular-nums">{formatLKR(fixedCalc.totalInterest)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-brand-200">Total payable</dt>
                  <dd className="tabular-nums font-bold">
                    {formatLKR(fixedCalc.totalPayable)}
                  </dd>
                </div>
                <div className="flex justify-between pt-3 border-t border-brand-700">
                  <dt className="text-brand-100">Monthly installment</dt>
                  <dd className="text-xl font-bold tabular-nums">
                    {formatLKR(fixedCalc.monthlyInstallment)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-brand-200">Late fee / month if overdue</dt>
                  <dd className="tabular-nums">{formatLKR(lateFeePerMonth)}</dd>
                </div>
              </dl>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
