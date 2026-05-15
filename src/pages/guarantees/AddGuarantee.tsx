import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, UploadCloudIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useT } from '../../i18n/I18nProvider';
import { Stepper } from '../../components/ui/Stepper';
import { useToast } from '../../components/ui/Toast';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { DatePicker } from '../../components/ui/DatePicker';
import type { Customer, Loan } from '../../types/entities';
import { formatLKR } from '../../lib/format';
const steps = [
{
  id: 'select',
  label: 'Select Loan'
},
{
  label: 'Item details'
},
{
  label: 'Storage & Confirm'
}];

export function AddGuarantee() {
  const navigate = useNavigate();
  const { t } = useT();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    loanId: '',
    type: 'VEHICLE_BOOK',
    description: '',
    estimatedValue: 0,
    storageLocation: '',
    receivedDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const loans: Loan[] = [];
  const customers: Customer[] = [];
  const activeLoans = loans.filter((l) => l.status === 'active');
  const selectedLoan = activeLoans.find((l) => l.id === formData.loanId);
  const selectedCustomer = selectedLoan
    ? customers.find((c) => c.id === selectedLoan.customerId)
    : null;
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((c) => c + 1);
    } else {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        navigate('/guarantees');
      }, 1000);
    }
  };
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((c) => c - 1);
    } else {
      navigate('/guarantees');
    }
  };
  const isStepValid = () => {
    if (currentStep === 0) return formData.loanId !== '';
    if (currentStep === 1) return formData.description.trim() !== '';
    if (currentStep === 2) return formData.storageLocation.trim() !== '';
    return true;
  };
  const handleConfirm = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      showToast('Guarantee added successfully', 'success');
      navigate('/guarantees');
    }, 1000);
  };
  return (
    <div className="max-w-2xl mx-auto pb-24">
      <PageHeader
        title="Add Guarantee"
        subtitle="Record an item held as collateral" />
      

      <div className="mb-8">
        <Stepper steps={steps} current={currentStep} />
      </div>

      <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{
              opacity: 0,
              x: 20
            }}
            animate={{
              opacity: 1,
              x: 0
            }}
            exit={{
              opacity: 0,
              x: -20
            }}
            transition={{
              duration: 0.2
            }}
            className="p-6 sm:p-8">
            
            {currentStep === 0 &&
            <div className="space-y-6">
                <div>
                  <label
                  htmlFor="loanId"
                  className="block text-sm font-medium leading-6 text-neutral-900">
                  
                    Select Loan *
                  </label>
                  <select
                  id="loanId"
                  value={formData.loanId}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    loanId: e.target.value
                  })
                  }
                  className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6">
                  
                    <option value="">-- Select a loan --</option>
                    {activeLoans.map((loan) => {
                    const cust = customers.find(
                      (c) => c.id === loan.customerId
                    );
                    return (
                      <option key={loan.id} value={loan.id}>
                          {loan.id} - {cust?.name} ({formatLKR(loan.balance)})
                        </option>);

                  })}
                  </select>
                </div>

                {selectedLoan && selectedCustomer &&
              <div className="rounded-lg bg-brand-50 p-4 border border-brand-100">
                    <h4 className="text-sm font-medium text-brand-900 mb-2">
                      Selected Loan
                    </h4>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-brand-700">Customer</dt>
                        <dd className="font-medium text-brand-900">
                          {selectedCustomer.name}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-brand-700">Loan ID</dt>
                        <dd className="font-medium text-brand-900 font-mono">
                          {selectedLoan.id}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-brand-700">Balance</dt>
                        <dd className="font-medium text-brand-900 tabular-nums">
                          {formatLKR(selectedLoan.balance)}
                        </dd>
                      </div>
                    </dl>
                  </div>
              }
              </div>
            }

            {currentStep === 1 &&
            <div className="space-y-6">
                <div>
                  <label
                  htmlFor="type"
                  className="block text-sm font-medium leading-6 text-neutral-900">
                  
                    Item Type
                  </label>
                  <select
                  id="type"
                  value={formData.type}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value
                  })
                  }
                  className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6">
                  
                    <option value="VEHICLE_BOOK">Vehicle Book</option>
                    <option value="GOLD">Gold</option>
                    <option value="ELECTRONICS">Electronics</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label
                  htmlFor="description"
                  className="block text-sm font-medium leading-6 text-neutral-900">
                  
                    Description *
                  </label>
                  <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value
                  })
                  }
                  placeholder="e.g., Honda CRV 2018 CR-XXXX original book"
                  className="mt-2 block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
                
                </div>

                <div>
                  <CurrencyInput
                  label="Estimated Value (Optional)"
                  value={formData.estimatedValue}
                  onChange={(val) =>
                  setFormData({
                    ...formData,
                    estimatedValue: val
                  })
                  } />
                
                </div>

                <div>
                  <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                    Photos (Optional)
                  </label>
                  <div className="mt-2 flex justify-center rounded-lg border border-dashed border-neutral-300 px-6 py-10 hover:bg-neutral-50 transition-colors cursor-pointer">
                    <div className="text-center">
                      <UploadCloudIcon
                      className="mx-auto h-12 w-12 text-neutral-300"
                      aria-hidden="true" />
                    
                      <div className="mt-4 flex text-sm leading-6 text-neutral-600 justify-center">
                        <span className="relative cursor-pointer rounded-md bg-transparent font-semibold text-brand-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-600 focus-within:ring-offset-2 hover:text-brand-500">
                          Upload a file
                        </span>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs leading-5 text-neutral-500">
                        PNG, JPG up to 10MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            }

            {currentStep === 2 &&
            <div className="space-y-6">
                <div>
                  <label
                  htmlFor="storageLocation"
                  className="block text-sm font-medium leading-6 text-neutral-900">
                  
                    Storage Location *
                  </label>
                  <input
                  type="text"
                  id="storageLocation"
                  value={formData.storageLocation}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    storageLocation: e.target.value
                  })
                  }
                  placeholder="e.g., Safe Box A1, Cabinet 3"
                  className="mt-2 block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
                
                  <p className="mt-1 text-xs text-neutral-500">
                    Where will you keep this item?
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                    Received Date
                  </label>
                  <DatePicker
                  value={formData.receivedDate}
                  onChange={(val) =>
                  setFormData({
                    ...formData,
                    receivedDate: val
                  })
                  } />
                
                </div>

                <div>
                  <label
                  htmlFor="notes"
                  className="block text-sm font-medium leading-6 text-neutral-900">
                  
                    Additional Notes
                  </label>
                  <textarea
                  id="notes"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    notes: e.target.value
                  })
                  }
                  className="mt-2 block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
                
                </div>

                <div className="mt-8 rounded-lg bg-neutral-50 p-4 border border-neutral-200">
                  <h4 className="text-sm font-medium text-neutral-900 mb-4 flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-success-500" />
                    Summary
                  </h4>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-neutral-500">Loan</dt>
                      <dd className="font-medium text-neutral-900 font-mono">
                        {formData.loanId}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500">Type</dt>
                      <dd className="font-medium text-neutral-900">
                        {formData.type.replace('_', ' ')}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-neutral-500">Description</dt>
                      <dd className="font-medium text-neutral-900">
                        {formData.description}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-neutral-500">Location</dt>
                      <dd className="font-medium text-neutral-900">
                        {formData.storageLocation}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            }
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-neutral-200 p-4 z-10">
        <div className="max-w-2xl mx-auto flex justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50">
            
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!isStepValid() || isSubmitting}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50">
            
            {isSubmitting ?
            'Saving...' :
            currentStep === steps.length - 1 ?
            'Confirm & Save' :
            'Next step'}
          </button>
        </div>
      </div>
    </div>);

}