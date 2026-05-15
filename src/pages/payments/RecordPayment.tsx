import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../../i18n/I18nProvider';
import { useToast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/ui/PageHeader';
import { Stepper } from '../../components/ui/Stepper';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { DatePicker } from '../../components/ui/DatePicker';
import type { Customer, Loan } from '../../types/entities';
import { formatLKR, formatEnum } from '../../lib/format';
const steps = [
{
  id: 'select',
  label: 'Select Loan'
},
{
  label: 'Payment Details'
},
{
  label: 'Confirm'
}];

export function RecordPayment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useT();
  const { showToast } = useToast();
  const initialLoanId = searchParams.get('loanId');
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Form State
  const [loanSearch, setLoanSearch] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(
    initialLoanId
  );
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>(
    'CASH'
  );
  const [date, setDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const loans: Loan[] = [];
  const customers: Customer[] = [];
  const selectedLoan = selectedLoanId
    ? loans.find((l) => l.id === selectedLoanId)
    : null;
  const selectedCustomer = selectedLoan
    ? customers.find((c) => c.id === selectedLoan.customerId)
    : null;
  useEffect(() => {
    if (initialLoanId && selectedLoan) {
      setCurrentStep(1);
      setAmount(selectedLoan.installmentAmount);
    }
  }, [initialLoanId, selectedLoan]);
  const filteredLoans = loans
    .filter((l) => {
      if (!loanSearch) return false;
      const customer = customers.find((c) => c.id === l.customerId);
      return (
        l.id.toLowerCase().includes(loanSearch.toLowerCase()) ||
        customer?.name.toLowerCase().includes(loanSearch.toLowerCase()) ||
        customer?.nic.toLowerCase().includes(loanSearch.toLowerCase())
      );
    })
    .slice(0, 5);
  const handleNext = () => {
    if (currentStep === 0 && !selectedLoanId) return;
    if (currentStep === 1 && amount <= 0) return;
    if (currentStep < steps.length - 1) {
      if (currentStep === 0 && selectedLoan && amount === 0) {
        setAmount(selectedLoan.installmentAmount ?? 0);
      }
      setCurrentStep(currentStep + 1);
    } else {
      setIsSubmitting(true);
      setTimeout(() => {
        navigate('/payments/success');
      }, 1000);
    }
  };
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate('/payments');
    }
  };
  const handleConfirm = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      showToast('Payment recorded successfully', 'success');
      navigate('/payments/success');
    }, 1000);
  };
  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Record Payment"
        subtitle="Process a new payment receipt" />
      

      <div className="mb-8">
        <Stepper steps={steps} current={currentStep} />
      </div>

      <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-lg p-6 mb-6 min-h-[400px]">
        {currentStep === 0 &&
        <div className="space-y-6">
            <h3 className="text-lg font-medium leading-6 text-neutral-900">
              Select Loan
            </h3>

            {!selectedLoanId ?
          <div>
                <label className="block text-sm font-medium leading-6 text-neutral-900 mb-1">
                  Search by Customer Name, NIC, or Loan ID
                </label>
                <input
              type="text"
              value={loanSearch}
              onChange={(e) => setLoanSearch(e.target.value)}
              placeholder="e.g. Kasun or LN-00001"
              className="block w-full rounded-md border-0 py-1.5 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 mb-4" />
            

                {loanSearch && filteredLoans.length > 0 &&
            <ul className="divide-y divide-neutral-200 border border-neutral-200 rounded-md overflow-hidden">
                    {filteredLoans.map((l) => {
                const c = customers.find((cust) => cust.id === l.customerId);
                return (
                  <li
                    key={l.id}
                    onClick={() => setSelectedLoanId(l.id)}
                    className="p-4 hover:bg-brand-50 cursor-pointer transition-colors flex justify-between items-center">
                    
                          <div>
                            <p className="text-sm font-medium text-neutral-900">
                              {c?.name}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {l.id} • {formatEnum(l.type)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-neutral-900 tabular-nums">
                              {formatLKR(l.balance)}
                            </p>
                            <p className="text-xs text-neutral-500">Balance</p>
                          </div>
                        </li>);

              })}
                  </ul>
            }
                {loanSearch && filteredLoans.length === 0 &&
            <p className="text-sm text-neutral-500 text-center py-4">
                    No loans found.
                  </p>
            }
              </div> :

          <div className="rounded-md bg-brand-50 p-4 ring-1 ring-brand-200 relative">
                <button
              onClick={() => setSelectedLoanId(null)}
              className="absolute top-4 right-4 text-sm text-brand-600 hover:text-brand-800 font-medium">
              
                  Change
                </button>
                <h4 className="text-sm font-medium text-brand-900 mb-4">
                  Selected Loan
                </h4>
                <dl className="divide-y divide-brand-200/50">
                  <div className="py-2 flex justify-between">
                    <dt className="text-sm font-medium text-brand-700">
                      Customer
                    </dt>
                    <dd className="text-sm text-brand-900">
                      {selectedCustomer?.name}
                    </dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-sm font-medium text-brand-700">
                      Loan ID
                    </dt>
                    <dd className="text-sm text-brand-900 tabular-nums">
                      {selectedLoan?.loanCode}
                    </dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-sm font-medium text-brand-700">
                      Current Balance
                    </dt>
                    <dd className="text-sm font-bold text-brand-900 tabular-nums">
                      {formatLKR(selectedLoan?.balanceAmount || 0)}
                    </dd>
                  </div>
                </dl>
              </div>
          }
          </div>
        }

        {currentStep === 1 && selectedLoan &&
        <div className="space-y-6">
            <h3 className="text-lg font-medium leading-6 text-neutral-900">
              Payment Details
            </h3>

            <div>
              <CurrencyInput
              label="Amount *"
              value={amount}
              onChange={(val) => setAmount(val)} />
            
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                type="button"
                onClick={() => setAmount(selectedLoan.installmentAmount ?? 0)}
                className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-600/20 hover:bg-brand-100">
                
                  Installment: {formatLKR(selectedLoan.installmentAmount ?? 0)}
                </button>
                <button
                type="button"
                onClick={() => setAmount(selectedLoan.balanceAmount)}
                className="inline-flex items-center rounded-full bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-600 ring-1 ring-inset ring-neutral-500/20 hover:bg-neutral-100">
                
                  Full Balance: {formatLKR(selectedLoan.balanceAmount)}
                </button>
                <button
                type="button"
                onClick={() => setAmount(0)}
                className="inline-flex items-center rounded-full bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-600 ring-1 ring-inset ring-neutral-500/20 hover:bg-neutral-100">
                
                  Custom
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium leading-6 text-neutral-900 mb-1">
                  Payment Method *
                </label>
                <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="block w-full rounded-md border-0 py-1.5 pl-3 pr-8 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 bg-white">
                
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium leading-6 text-neutral-900 mb-1">
                  Date *
                </label>
                <DatePicker
                value={date}
                onChange={(e) => setDate(e.target.value)} />
              
              </div>
            </div>
          </div>
        }

        {currentStep === 2 && selectedLoan &&
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
                    {selectedCustomer?.name}
                  </dd>
                </div>
                <div className="py-3 flex justify-between">
                  <dt className="text-sm font-medium text-neutral-500">
                    Loan ID
                  </dt>
                  <dd className="text-sm text-neutral-900 tabular-nums">
                    {selectedLoan.loanCode}
                  </dd>
                </div>
                <div className="py-3 flex justify-between">
                  <dt className="text-sm font-medium text-neutral-500">
                    Payment Amount
                  </dt>
                  <dd className="text-lg font-bold text-brand-600 tabular-nums">
                    {formatLKR(amount)}
                  </dd>
                </div>
                <div className="py-3 flex justify-between">
                  <dt className="text-sm font-medium text-neutral-500">
                    Method
                  </dt>
                  <dd className="text-sm text-neutral-900">
                    {formatEnum(method)}
                  </dd>
                </div>
                <div className="py-3 flex justify-between">
                  <dt className="text-sm font-medium text-neutral-500">
                    New Balance
                  </dt>
                  <dd className="text-sm font-medium text-neutral-900 tabular-nums">
                    {formatLKR(Math.max(0, selectedLoan.balanceAmount - amount))}
                  </dd>
                </div>
              </dl>
            </div>
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
          disabled={
          isSubmitting ||
          currentStep === 0 && !selectedLoanId ||
          currentStep === 1 && amount <= 0
          }
          className="inline-flex justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50">
          
          {isSubmitting ?
          'Processing...' :
          currentStep === steps.length - 1 ?
          'Confirm Payment' :
          'Next Step'}
        </button>
      </div>
    </div>);

}