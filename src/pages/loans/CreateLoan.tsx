import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../i18n/I18nProvider';
import { useToast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/ui/PageHeader';
import { Stepper } from '../../components/ui/Stepper';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import type { Bike, Customer } from '../../types/entities';
import { formatLKR } from '../../lib/format';
const steps = [
{
  id: 'setup',
  label: 'Setup'
},
{
  label: 'Terms'
},
{
  label: 'Collateral'
},
{
  label: 'Confirm'
}];

export function CreateLoan() {
  const navigate = useNavigate();
  const { t } = useT();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Form State
  const [customerId, setCustomerId] = useState('');
  const [loanType, setLoanType] = useState<'cash' | 'bike'>('cash');
  const [principal, setPrincipal] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(18);
  const [termMonths, setTermMonths] = useState<number>(12);
  const [bikeId, setBikeId] = useState('');
  const customers: Customer[] = [];
  const bikes: Bike[] = [];
  // Live Calculations
  const calculations = useMemo(() => {
    const p = principal || 0;
    const r = interestRate || 0;
    const t = termMonths || 1;
    // Simple interest calculation
    const totalInterest = p * (r / 100) * (t / 12);
    const totalPayable = p + totalInterest;
    const monthlyInstallment = totalPayable / t;
    return {
      principal: p,
      totalInterest,
      totalPayable,
      monthlyInstallment
    };
  }, [principal, interestRate, termMonths]);
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsSubmitting(true);
      setTimeout(() => {
        navigate('/loans');
      }, 1000);
    }
  };
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate('/loans');
    }
  };
  const handleConfirm = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      showToast('Loan created successfully', 'success');
      navigate('/loans');
    }, 1500);
  };
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Create Loan" subtitle="Set up a new loan agreement" />

      <div className="mb-8 max-w-3xl">
        <Stepper steps={steps} current={currentStep} />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Wizard Steps (60%) */}
        <div className="flex-1 lg:max-w-[60%]">
          <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-lg p-6 mb-6 min-h-[400px]">
            {currentStep === 0 &&
            <div className="space-y-6">
                <h3 className="text-lg font-medium leading-6 text-neutral-900">
                  Loan Setup
                </h3>
                <div>
                  <label className="block text-sm font-medium leading-6 text-neutral-900 mb-1">
                    Select Customer *
                  </label>
                  <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 pl-3 pr-8 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 bg-white">
                  
                    <option value="">-- Select a customer --</option>
                    {customers.map((c) =>
                  <option key={c.id} value={c.id}>
                        {c.name} ({c.nic})
                      </option>
                  )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                    Loan Type *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                      type="radio"
                      checked={loanType === 'cash'}
                      onChange={() => setLoanType('cash')}
                      className="h-4 w-4 text-brand-600 focus:ring-brand-600 border-neutral-300" />
                    
                      <span className="text-sm text-neutral-900">
                        Cash Loan
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                      type="radio"
                      checked={loanType === 'bike'}
                      onChange={() => setLoanType('bike')}
                      className="h-4 w-4 text-brand-600 focus:ring-brand-600 border-neutral-300" />
                    
                      <span className="text-sm text-neutral-900">
                        Bike Installment
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            }

            {currentStep === 1 &&
            <div className="space-y-6">
                <h3 className="text-lg font-medium leading-6 text-neutral-900">
                  Loan Terms
                </h3>
                <CurrencyInput
                label="Principal Amount *"
                value={principal}
                onChange={(val) => setPrincipal(val)}
                placeholder="e.g. 100,000" />
              
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium leading-6 text-neutral-900 mb-1">
                      Interest Rate (%) *
                    </label>
                    <input
                    type="number"
                    value={interestRate}
                    onChange={(e) =>
                    setInterestRate(parseFloat(e.target.value) || 0)
                    }
                    className="block w-full rounded-md border-0 py-1.5 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 tabular-nums" />
                  
                  </div>
                  <div>
                    <label className="block text-sm font-medium leading-6 text-neutral-900 mb-1">
                      Term (Months) *
                    </label>
                    <input
                    type="number"
                    value={termMonths}
                    onChange={(e) =>
                    setTermMonths(parseInt(e.target.value, 10) || 0)
                    }
                    className="block w-full rounded-md border-0 py-1.5 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 tabular-nums" />
                  
                  </div>
                </div>
              </div>
            }

            {currentStep === 2 &&
            <div className="space-y-6">
                <h3 className="text-lg font-medium leading-6 text-neutral-900">
                  Collateral
                </h3>
                {loanType === 'bike' ?
              <div>
                    <label className="block text-sm font-medium leading-6 text-neutral-900 mb-1">
                      Select Bike from Stock *
                    </label>
                    <select
                  value={bikeId}
                  onChange={(e) => setBikeId(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 pl-3 pr-8 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 bg-white">
                  
                      <option value="">-- Select a bike --</option>
                      {bikes.
                  filter((b) => b.status === 'in_stock').
                  map((b) =>
                  <option key={b.id} value={b.id}>
                            {b.model} - {b.engineNo} ({formatLKR(b.price)})
                          </option>
                  )}
                    </select>
                  </div> :

              <div className="rounded-md bg-info-50 p-4">
                    <div className="flex">
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-info-800">
                          Optional Guarantee
                        </h3>
                        <div className="mt-2 text-sm text-info-700">
                          <p>
                            You can add a guarantee item (like a vehicle book or
                            gold) after creating the loan from the loan details
                            page.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
              }
              </div>
            }

            {currentStep === 3 &&
            <div className="space-y-6">
                <h3 className="text-lg font-medium leading-6 text-neutral-900">
                  Review & Confirm
                </h3>
                <div className="rounded-md bg-neutral-50 p-4 ring-1 ring-neutral-200">
                  <dl className="divide-y divide-neutral-200">
                    <div className="py-3 flex justify-between">
                      <dt className="text-sm font-medium text-neutral-500">
                        Customer
                      </dt>
                      <dd className="text-sm text-neutral-900">
                        {customers.find((c) => c.id === customerId)?.name ||
                      '—'}
                      </dd>
                    </div>
                    <div className="py-3 flex justify-between">
                      <dt className="text-sm font-medium text-neutral-500">
                        Type
                      </dt>
                      <dd className="text-sm text-neutral-900 capitalize">
                        {loanType}
                      </dd>
                    </div>
                    {loanType === 'bike' &&
                  <div className="py-3 flex justify-between">
                        <dt className="text-sm font-medium text-neutral-500">
                          Bike
                        </dt>
                        <dd className="text-sm text-neutral-900">
                          {bikes.find((b) => b.id === bikeId)?.model || '—'}
                        </dd>
                      </div>
                  }
                  </dl>
                </div>
                <p className="text-sm text-neutral-500">
                  Please review the calculation panel on the right before
                  confirming.
                </p>
              </div>
            }
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="text-sm font-semibold leading-6 text-neutral-900 hover:text-neutral-700">
              
              {currentStep === 0 ? 'Cancel' : 'Back'}
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="inline-flex justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50">
              
              {isSubmitting ?
              'Saving...' :
              currentStep === steps.length - 1 ?
              'Confirm Loan' :
              'Next Step'}
            </button>
          </div>
        </div>

        {/* Right: Sticky Live Calculation (40%) */}
        <div className="flex-1 lg:max-w-[40%]">
          <div className="sticky top-24 bg-brand-800 rounded-xl shadow-lg overflow-hidden text-white">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-6 text-brand-50">
                Live Calculation
              </h3>

              <dl className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <dt className="text-sm text-brand-200">Principal</dt>
                  <dd className="text-lg font-medium tabular-nums">
                    {formatLKR(calculations.principal)}
                  </dd>
                </div>
                <div className="flex justify-between items-baseline">
                  <dt className="text-sm text-brand-200">
                    Interest ({interestRate}%)
                  </dt>
                  <dd className="text-lg font-medium tabular-nums">
                    {formatLKR(calculations.totalInterest)}
                  </dd>
                </div>
                <div className="pt-4 border-t border-brand-700 flex justify-between items-baseline">
                  <dt className="text-sm font-medium text-brand-100">
                    Total Payable
                  </dt>
                  <dd className="text-xl font-bold tabular-nums">
                    {formatLKR(calculations.totalPayable)}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="bg-brand-900 p-6">
              <div className="flex justify-between items-baseline">
                <dt className="text-sm font-medium text-brand-100">
                  Monthly Installment
                </dt>
                <dd className="text-2xl font-bold text-white tabular-nums">
                  {formatLKR(calculations.monthlyInstallment)}
                </dd>
              </div>
              <p className="mt-2 text-xs text-brand-300 text-right">
                For {termMonths} months
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>);

}