import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircleIcon, SearchIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
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

const STEPS = [
  { id: 'customer', label: 'Customer' },
  { label: 'Loan' },
  { label: 'Payment' },
  { label: 'Review' },
  { label: 'Confirm' },
];

export function RecordPayment() {
  const navigate = useNavigate();
  const db = useDemoDb();
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
  const [customerSearch, setCustomerSearch] = useState('');
  const [loanSearch, setLoanSearch] = useState('');

  const [form, setForm] = useState<PaymentFormState>({
    amount: 0,
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

  const filteredCustomers = customers.filter(
    (c) =>
      !customerSearch ||
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.nic.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.customerCode ?? '').toLowerCase().includes(customerSearch.toLowerCase())
  );

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
        return form.amount > 0;
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

  const handleConfirm = () => {
    if (!selectedLoan || !selectedCustomer || !computation.receipt) return;
    const result = recordPayment(
      {
        loanId: selectedLoan.id,
        customerId: selectedCustomer.id,
        amount: form.amount,
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        notes: form.notes || undefined,
        chequeNumber: form.chequeNumber || undefined,
        bankReference: form.bankReference || undefined,
      },
      db
    );
    navigate('/payments/success', {
      state: {
        loanCode: selectedLoan.loanCode,
        loanId: selectedLoan.id,
        customerName: selectedCustomer.name,
        amount: form.amount,
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        repaymentMethod: selectedLoan.repaymentMethod,
        receipt: computation.receipt,
        allocationRows: computation.allocationRows,
        receiptNumber: result.receiptNumber,
        supabasePending: false,
      },
    });
  };

  const primaryLabel = (): string => {
    if (currentStep === STEPS.length - 1) return 'Confirm Payment';
    if (currentStep === 2) return 'Review Payment';
    return 'Continue';
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Record Payment"
        subtitle="Customer → loan → payment with live allocation preview"
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

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 lg:max-w-[62%] space-y-6">
          {/* Step 0: Customer */}
          {currentStep === 0 && (
            <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                Select customer
              </h3>

              {customers.length === 0 ? (
                <EmptyState
                  icon={AlertCircleIcon}
                  title="No customers available"
                  description="Create a customer and an active loan first, or reset demo data from the header."
                />
              ) : (
                <>
                  <div className="relative mb-4">
                    <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search name, NIC, or customer code"
                      className="block w-full rounded-md border-0 py-2 pl-10 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm"
                    />
                  </div>
                  <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 overflow-hidden">
                    {filteredCustomers.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerId(c.id)}
                          className={`w-full text-left px-4 py-3 hover:bg-brand-50 transition-colors ${
                            selectedCustomerId === c.id
                              ? 'bg-brand-50 ring-2 ring-inset ring-brand-500'
                              : ''
                          }`}
                        >
                          <p className="font-medium text-neutral-900">{c.name}</p>
                          <p className="text-xs text-neutral-500">
                            {c.customerCode ?? c.nic} · {c.phone}
                          </p>
                        </button>
                      </li>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <li className="px-4 py-8 text-center text-sm text-neutral-500">
                        No customers match your search.
                      </li>
                    )}
                  </ul>
                  <p className="mt-3 text-xs text-neutral-500">
                    Local demo · {previewBundle.label}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Step 1: Loan */}
          {currentStep === 1 && (
            <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                Select loan
              </h3>
              <p className="text-sm text-neutral-500 mb-4">
                {selectedCustomer?.name}
              </p>
              <input
                type="text"
                value={loanSearch}
                onChange={(e) => setLoanSearch(e.target.value)}
                placeholder="Search loan code or type"
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
                    No loans for this customer.
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Step 2: Payment */}
          {currentStep === 2 && selectedLoan && (
            <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-6 space-y-5">
              <h3 className="text-lg font-semibold text-neutral-900">
                Enter payment
              </h3>
              <CurrencyInput
                label="Payment amount *"
                value={form.amount}
                onChange={(amount) => setForm((f) => ({ ...f, amount }))}
              />
              {isFixedInstallmentLoan(selectedLoan) && computation.fixedDueSummary && (
                <div className="flex flex-wrap gap-2">
                  <QuickAmount
                    label={`Total due ${formatLKR(computation.fixedDueSummary.totalDue)}`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        amount: computation.fixedDueSummary!.totalDue,
                      }))
                    }
                  />
                  <QuickAmount
                    label={`Current ${formatLKR(computation.fixedDueSummary.currentMonthDue)}`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        amount: computation.fixedDueSummary!.currentMonthDue,
                      }))
                    }
                  />
                  <QuickAmount
                    label="45,000 (arrears example)"
                    onClick={() => setForm((f) => ({ ...f, amount: 45_000 }))}
                  />
                </div>
              )}
              {isInterestOnlyLoan(selectedLoan) && (
                <div className="flex flex-wrap gap-2">
                  <QuickAmount
                    label="55,000 (full example)"
                    onClick={() => setForm((f) => ({ ...f, amount: 55_000 }))}
                  />
                  <QuickAmount
                    label="3,000 (partial interest)"
                    onClick={() => setForm((f) => ({ ...f, amount: 3_000 }))}
                  />
                  <QuickAmount
                    label={`Interest due ${formatLKR(computation.interestOnlySummary?.currentCycleInterestDue ?? 0)}`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        amount:
                          computation.interestOnlySummary?.currentCycleInterestDue ?? 0,
                      }))
                    }
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-1">
                  Payment method *
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
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              {form.paymentMethod === 'CHEQUE' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-1">
                    Cheque number *
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
                    Bank reference *
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
                label="Payment date *"
                value={form.paymentDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paymentDate: e.target.value }))
                }
              />
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-1">
                  Notes
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
            <div className="space-y-6">
              <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                  Allocation preview
                </h3>
                <AllocationSummary
                  loan={selectedLoan}
                  allocation={computation.allocation}
                  receipt={computation.receipt}
                />
                {computation.allocationRows.length > 0 && (
                  <AllocationTable rows={computation.allocationRows} />
                )}
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {currentStep === 4 && selectedLoan && (
            <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-neutral-900">
                Confirm payment
              </h3>
              <p className="text-sm text-neutral-600">
                Payment will be saved to local demo storage and update loan balances.
              </p>
              <dl className="divide-y divide-neutral-200 text-sm">
                <Row label="Customer" value={selectedCustomer?.name ?? '—'} />
                <Row label="Loan" value={selectedLoan.loanCode} />
                <Row label="Amount" value={formatLKR(form.amount)} bold />
                <Row label="Method" value={formatEnum(form.paymentMethod)} />
                <Row label="Date" value={formatDate(form.paymentDate)} />
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
            canContinue={canContinue()}
            primaryLabel={primaryLabel()}
            onBack={handleBack}
            onNext={currentStep === STEPS.length - 1 ? handleConfirm : handleNext}
          />
        </div>

        <aside className="flex-1 lg:max-w-[38%]">
          <div className="lg:sticky lg:top-24">
            <SummaryPanel
              step={currentStep}
              customer={selectedCustomer}
              loan={selectedLoan}
              form={form}
              computation={computation}
            />
          </div>
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
  canContinue,
  primaryLabel,
  onBack,
  onNext,
}: {
  currentStep: number;
  canContinue: boolean;
  primaryLabel: string;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex justify-between pt-2">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-semibold text-neutral-900"
      >
        {currentStep === 0 ? 'Cancel' : 'Back'}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canContinue}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
      >
        {primaryLabel}
      </button>
    </div>
  );
}

function SummaryPanel({
  step,
  customer,
  loan,
  form,
  computation,
}: {
  step: number;
  customer: Customer | null | undefined;
  loan: Loan | null | undefined;
  form: PaymentFormState;
  computation: ReturnType<typeof usePaymentComputation>;
}) {
  if (!loan) {
    return (
      <div className="rounded-xl bg-neutral-100 p-6 text-sm text-neutral-600">
        Select a customer and loan to see the payment summary.
      </div>
    );
  }

  const isIO = isInterestOnlyLoan(loan);
  const isFixed = isFixedInstallmentLoan(loan);

  return (
    <div className="rounded-xl bg-brand-800 text-white shadow-lg overflow-hidden">
      <div className="p-6 border-b border-brand-700">
        <h3 className="text-lg font-medium text-brand-50">Payment summary</h3>
        {customer && (
          <p className="mt-1 text-sm text-brand-200">{customer.name}</p>
        )}
        <p className="text-sm font-mono text-brand-100 tabular-nums">
          {loan.loanCode}
        </p>
      </div>
      <div className="p-6 space-y-3 text-sm">
        {isIO && computation.interestOnlySummary && (
          <>
            <SummaryLine
              label="Current principal"
              value={formatLKR(loan.currentPrincipalBalance)}
            />
            <SummaryLine
              label="Pending interest"
              value={formatLKR(computation.interestOnlySummary.pendingInterest)}
            />
            <SummaryLine
              label="Current cycle interest"
              value={formatLKR(
                computation.interestOnlySummary.currentCycleInterestDue
              )}
            />
            <SummaryLine
              label="Monthly rate"
              value={`${loan.interestRate}%`}
            />
            <SummaryLine
              label="Next due"
              value={formatDate(loan.dueDate ?? loan.firstDueDate)}
            />
          </>
        )}
        {isFixed && (
          <>
            <SummaryLine
              label="Total payable"
              value={formatLKR(loan.totalPayable ?? 0)}
            />
            <SummaryLine label="Paid" value={formatLKR(loan.paidAmount)} />
            <SummaryLine label="Balance" value={formatLKR(loan.balanceAmount)} />
            <SummaryLine
              label="Installment"
              value={formatLKR(loan.installmentAmount ?? 0)}
            />
            <SummaryLine label="Late fee rate" value={`${loan.lateFeeRate}%`} />
            <SummaryLine
              label="Next due"
              value={formatDate(loan.dueDate ?? loan.firstDueDate)}
            />
            {computation.arrearsCount > 0 && (
              <SummaryLine
                label="Arrears"
                value={`${computation.arrearsCount} installment(s)`}
              />
            )}
            {computation.fixedDueSummary && step >= 2 && (
              <>
                <div className="pt-3 border-t border-brand-700" />
                <SummaryLine
                  label="Late fees due"
                  value={formatLKR(computation.fixedDueSummary.totalLateFeesDue)}
                />
                <SummaryLine
                  label="Arrears installments"
                  value={formatLKR(
                    computation.fixedDueSummary.totalArrearsInstallmentsDue
                  )}
                />
                <SummaryLine
                  label="Current month"
                  value={formatLKR(computation.fixedDueSummary.currentMonthDue)}
                />
                <SummaryLine
                  label="Total due today"
                  value={formatLKR(computation.fixedDueSummary.totalDue)}
                  highlight
                />
              </>
            )}
          </>
        )}
        {step >= 2 && form.amount > 0 && computation.allocation && (
          <>
            <div className="pt-3 border-t border-brand-700" />
            <p className="text-xs uppercase tracking-wide text-brand-300">
              Live preview
            </p>
            {isIO && computation.receipt && 'interestPaid' in computation.receipt && (
              <>
                <SummaryLine
                  label="Interest paid"
                  value={formatLKR(computation.receipt.interestPaid)}
                />
                <SummaryLine
                  label="Principal paid"
                  value={formatLKR(computation.receipt.principalPaid)}
                />
                <SummaryLine
                  label="Remaining principal"
                  value={formatLKR(computation.receipt.remainingPrincipal)}
                />
                <SummaryLine
                  label="Next est. interest"
                  value={formatLKR(computation.receipt.nextEstimatedInterest)}
                />
                {computation.receipt.pendingInterestRemaining > 0 && (
                  <SummaryLine
                    label="Pending interest"
                    value={formatLKR(
                      computation.receipt.pendingInterestRemaining
                    )}
                  />
                )}
              </>
            )}
            {isFixed &&
              computation.receipt &&
              'lateFeePaid' in computation.receipt && (
                <>
                  <SummaryLine
                    label="Late fees paid"
                    value={formatLKR(computation.receipt.lateFeePaid)}
                  />
                  <SummaryLine
                    label="Installments paid"
                    value={formatLKR(computation.receipt.installmentPaid)}
                  />
                  {computation.receipt.advancePaid > 0 && (
                    <SummaryLine
                      label="Advance"
                      value={formatLKR(computation.receipt.advancePaid)}
                    />
                  )}
                  <SummaryLine
                    label="Arrears remaining"
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

function AllocationSummary({
  loan,
  allocation,
  receipt,
}: {
  loan: Loan;
  allocation: NonNullable<ReturnType<typeof usePaymentComputation>['allocation']>;
  receipt: ReturnType<typeof usePaymentComputation>['receipt'];
}) {
  if (isInterestOnlyLoan(loan) && receipt && 'interestPaid' in receipt) {
    return (
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-6">
        <Metric label="Interest paid" value={formatLKR(receipt.interestPaid)} />
        <Metric label="Principal paid" value={formatLKR(receipt.principalPaid)} />
        <Metric
          label="Remaining principal"
          value={formatLKR(receipt.remainingPrincipal)}
        />
        <Metric
          label="Next estimated interest"
          value={formatLKR(receipt.nextEstimatedInterest)}
        />
        {receipt.pendingInterestRemaining > 0 && (
          <Metric
            label="Pending interest left"
            value={formatLKR(receipt.pendingInterestRemaining)}
            className="sm:col-span-2"
          />
        )}
      </dl>
    );
  }
  if (isFixedInstallmentLoan(loan) && receipt && 'lateFeePaid' in receipt) {
    return (
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-6">
        <Metric label="Late fees paid" value={formatLKR(receipt.lateFeePaid)} />
        <Metric
          label="Installments paid"
          value={formatLKR(receipt.installmentPaid)}
        />
        <Metric
          label="Arrears remaining"
          value={formatLKR(receipt.remainingArrears)}
        />
        <Metric label="Loan balance" value={formatLKR(receipt.loanBalance)} />
        {receipt.advancePaid > 0 && (
          <Metric
            label="Advance paid"
            value={formatLKR(receipt.advancePaid)}
            className="sm:col-span-2"
          />
        )}
      </dl>
    );
  }
  return (
    <p className="text-sm text-neutral-500 mb-4">
      Total allocated: {formatLKR(allocation.totalAllocated)}
    </p>
  );
}

function Metric({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-lg bg-neutral-50 p-3 ring-1 ring-neutral-200 ${className}`}>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-1 text-base font-semibold text-neutral-900 tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function AllocationTable({
  rows,
}: {
  rows: import('../../lib/finance/allocationDisplay').AllocationDisplayRow[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-3">Type</th>
            <th className="py-2 pr-3">Period</th>
            <th className="py-2 pr-3 text-right">Due</th>
            <th className="py-2 pr-3 text-right">Paid</th>
            <th className="py-2 text-right">Remaining</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row, i) => (
            <tr key={i}>
              <td className="py-2 pr-3 font-medium">{row.type}</td>
              <td className="py-2 pr-3 text-neutral-600">{row.period}</td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {formatLKR(row.due)}
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
  return (
    <div className="rounded-lg bg-neutral-50 p-4 ring-1 ring-neutral-200 mt-4">
      <h4 className="text-sm font-semibold text-neutral-900 mb-3">
        Receipt preview
      </h4>
      {isInterestOnlyLoan(loan) && 'interestPaid' in receipt && (
        <ul className="text-sm space-y-1 text-neutral-700">
          <li>Interest paid: {formatLKR(receipt.interestPaid)}</li>
          <li>Principal paid: {formatLKR(receipt.principalPaid)}</li>
          <li>Remaining principal: {formatLKR(receipt.remainingPrincipal)}</li>
          {receipt.pendingInterestRemaining > 0 && (
            <li>
              Pending interest: {formatLKR(receipt.pendingInterestRemaining)}
            </li>
          )}
        </ul>
      )}
      {isFixedInstallmentLoan(loan) && 'lateFeePaid' in receipt && (
        <ul className="text-sm space-y-1 text-neutral-700">
          <li>Late fee paid: {formatLKR(receipt.lateFeePaid)}</li>
          <li>Installment paid: {formatLKR(receipt.installmentPaid)}</li>
          {receipt.advancePaid > 0 && (
            <li>Advance paid: {formatLKR(receipt.advancePaid)}</li>
          )}
          <li>Remaining arrears: {formatLKR(receipt.remainingArrears)}</li>
          <li>Loan balance: {formatLKR(receipt.loanBalance)}</li>
        </ul>
      )}
    </div>
  );
}
