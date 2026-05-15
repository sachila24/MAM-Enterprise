import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/ui/PageHeader';
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

const steps = [
  { id: 'customer', label: 'Customer' },
  { label: 'Purpose' },
  { label: 'Method' },
  { label: 'Terms' },
  { label: 'Bike / Guarantee' },
  { label: 'Confirm' },
];

export function CreateLoan() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const db = useDemoDb();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [loanPurpose, setLoanPurpose] = useState<LoanPurpose>('CASH_LOAN');
  const [repaymentMethod, setRepaymentMethod] = useState<RepaymentMethod>(
    'FIXED_TERM_INSTALLMENT'
  );

  const [loanAmount, setLoanAmount] = useState(0);
  const [monthlyInterestRate, setMonthlyInterestRate] = useState(5);
  const [dueDay, setDueDay] = useState(1);

  const [financeAmount, setFinanceAmount] = useState(0);
  const [termMonths, setTermMonths] = useState(36);
  const [monthlyFlatRate, setMonthlyFlatRate] = useState(2.5);
  const [lateFeeRate, setLateFeeRate] = useState(DEFAULT_LATE_FEE_RATE_PERCENT);
  const [discountAmount, setDiscountAmount] = useState(0);

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
    const defaultMethod = defaultRepaymentMethod(purpose);
    if (defaultMethod) setRepaymentMethod(defaultMethod);
  };

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    if (date) setFirstDueDate(computeFirstDueDate(date));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      return;
    }
    if (!customerId) return;
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
        },
        db
      );
      showToast(`Loan ${loan.loanCode} created`, 'success');
      navigate(`/loans/${loan.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
    else navigate('/loans');
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Create Loan" subtitle="Set up a new loan agreement" />

      <div className="mb-8 max-w-3xl">
        <Stepper steps={steps} current={currentStep} />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 lg:max-w-[60%]">
          <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-lg p-6 mb-6 min-h-[400px]">
            {currentStep === 0 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-neutral-900">
                  Select Customer
                </h3>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 pl-3 pr-8 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm bg-white"
                >
                  <option value="">-- Select a customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.nic})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-900">
                  Loan Purpose
                </h3>
                {(
                  [
                    ['CASH_LOAN', 'Cash Loan'],
                    ['BIKE_INSTALLMENT', 'Bike Installment'],
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
                  Repayment Method
                </h3>
                {(
                  [
                    [
                      'INTEREST_ONLY_REDUCING_PRINCIPAL',
                      'Monthly Interest / Reducing Principal',
                    ],
                    ['FIXED_TERM_INSTALLMENT', 'Fixed Term Installment'],
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
                ))}
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
                    value={monthlyInterestRate}
                    onChange={(e) =>
                      setMonthlyInterestRate(parseFloat(e.target.value) || 0)
                    }
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
                  Guarantee required. No late fees. Unpaid interest stays pending.
                </p>
              </div>
            )}

            {currentStep === 3 && !isInterestOnly && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-900">
                  Fixed Installment Terms
                </h3>
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
                      value={monthlyFlatRate}
                      onChange={(e) =>
                        setMonthlyFlatRate(parseFloat(e.target.value) || 0)
                      }
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
                    value={lateFeeRate}
                    onChange={(e) =>
                      setLateFeeRate(parseFloat(e.target.value) || 0)
                    }
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

            {currentStep === 4 && isBike && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-900">Bike</h3>
                <select
                  value={bikeId}
                  onChange={(e) => {
                    setBikeId(e.target.value);
                    const bike = bikes.find((b) => b.id === e.target.value);
                    if (bike) setSellingPrice(bike.sellingPrice || bike.price);
                  }}
                  className="block w-full rounded-md border-0 py-1.5 pl-3 ring-1 ring-inset ring-neutral-300 sm:text-sm bg-white"
                >
                  <option value="">-- Select bike --</option>
                  {bikes
                    .filter((b) => b.status === 'in_stock')
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.model} — {b.engineNo}
                      </option>
                    ))}
                </select>
                <CurrencyInput
                  label="Selling price *"
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

            {currentStep === 4 && !isBike && (
              <p className="text-sm text-neutral-600">
                Guarantees can be added after loan creation from Loan Detail.
              </p>
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

          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="text-sm font-semibold text-neutral-900"
            >
              {currentStep === 0 ? 'Cancel' : 'Back'}
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSubmitting
                ? 'Saving...'
                : currentStep === steps.length - 1
                  ? 'Confirm Loan'
                  : 'Next'}
            </button>
          </div>
        </div>

        <div className="flex-1 lg:max-w-[40%]">
          <div className="sticky top-24 bg-brand-800 rounded-xl shadow-lg text-white p-6">
            <h3 className="text-lg font-medium mb-4 text-brand-50">
              Calculation
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
  );
}
