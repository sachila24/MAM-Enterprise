import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, UploadCloudIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { CustomerSearchPicker } from '../../components/customers/CustomerSearchPicker';
import { Stepper } from '../../components/ui/Stepper';
import { useToast } from '../../components/ui/Toast';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { DatePicker } from '../../components/ui/DatePicker';
import { formatLKR } from '../../lib/format';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import {
  createGuarantee,
  listCustomers,
  listLoans,
} from '../../lib/local-db/repositories';
import type { CreateGuaranteeInput } from '../../lib/local-db/repositories/guaranteesRepo';

const steps = [
  { id: 'customer', label: 'Customer' },
  { label: 'Loan' },
  { label: 'Item details' },
  { label: 'Storage & Confirm' },
];

export function AddGuarantee() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillLoanId = searchParams.get('loanId') ?? '';
  const { showToast } = useToast();
  const db = useDemoDb();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = React.useRef(false);
  const [formData, setFormData] = useState({
    customerId: '',
    loanId: prefillLoanId,
    type: 'VEHICLE_BOOK' as CreateGuaranteeInput['itemType'],
    description: '',
    estimatedValue: 0,
    storageLocation: '',
    receivedDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const loans = listLoans(db);
  const customers = listCustomers(db);

  const activeLoans = useMemo(
    () => loans.filter((l) => l.status === 'ACTIVE'),
    [loans]
  );

  const customerLoans = useMemo(
    () =>
      formData.customerId
        ? activeLoans.filter((l) => l.customerId === formData.customerId)
        : [],
    [activeLoans, formData.customerId]
  );

  const selectedCustomer = customers.find((c) => c.id === formData.customerId);
  const selectedLoan = customerLoans.find((l) => l.id === formData.loanId);

  useEffect(() => {
    if (prefillLoanId && loans.length > 0) {
      const loan = loans.find((l) => l.id === prefillLoanId);
      if (loan) {
        setFormData((f) => ({
          ...f,
          customerId: loan.customerId,
          loanId: loan.id,
        }));
        setCurrentStep(1);
      }
    }
  }, [prefillLoanId, loans]);

  const isStepValid = () => {
    if (currentStep === 0) return formData.customerId !== '';
    if (currentStep === 1) return formData.loanId !== '';
    if (currentStep === 2) return formData.description.trim() !== '';
    if (currentStep === 3) return formData.storageLocation.trim() !== '';
    return true;
  };

  const handleNext = async () => {
    if (!isStepValid()) return;

    if (currentStep < steps.length - 1) {
      setCurrentStep((c) => c + 1);
      return;
    }

    if (!selectedLoan || !selectedCustomer) return;
    if (submitLockRef.current) return;

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      const receivedAt = formData.receivedDate.includes('T')
        ? formData.receivedDate
        : `${formData.receivedDate}T12:00:00.000Z`;

      const g = createGuarantee(
        {
          loanId: selectedLoan.id,
          customerId: selectedLoan.customerId,
          itemType: formData.type,
          description: formData.description.trim(),
          storageLocation: formData.storageLocation.trim(),
          receivedAt,
          notes: formData.notes.trim() || undefined,
        },
        db
      );
      showToast(`Guarantee ${g.guaranteeCode} saved successfully`, 'success');
      navigate(`/guarantees/${g.id}`, { replace: true });
    } catch {
      showToast('Could not save guarantee', 'error');
      submitLockRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((c) => c - 1);
    } else {
      navigate('/guarantees');
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <PageHeader
        title="Add Guarantee"
        subtitle="Record an item held as collateral"
      />

      <div className="mb-8">
        <Stepper steps={steps} current={currentStep} />
      </div>

      <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="p-6 sm:p-8"
          >
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                    Select customer *
                  </label>
                  <CustomerSearchPicker
                    customers={customers}
                    selectedCustomerId={formData.customerId || null}
                    onSelect={(id) =>
                      setFormData({
                        ...formData,
                        customerId: id ?? '',
                        loanId: '',
                      })
                    }
                  />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="loanId" className="block text-sm font-medium leading-6 text-neutral-900">Select loan *</label>
                  <select id="loanId" value={formData.loanId} onChange={(e) => setFormData({ ...formData, loanId: e.target.value })} disabled={!formData.customerId} className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 disabled:bg-neutral-50">
                    <option value="">{formData.customerId ? '-- Select an active loan --' : '-- Select a customer first --'}</option>
                    {customerLoans.map((loan) => (<option key={loan.id} value={loan.id}>{loan.loanCode} · {formatLKR(loan.balanceAmount)}</option>))}
                  </select>
                </div>
                {selectedLoan && (
                  <div className="rounded-lg bg-brand-50 p-4 border border-brand-100 text-sm">
                    <p className="text-brand-700">Loan <span className="font-semibold text-brand-900 tabular-nums">{selectedLoan.loanCode}</span></p>
                    <p className="text-brand-700 mt-1">Balance <span className="font-medium tabular-nums">{formatLKR(selectedLoan.balanceAmount)}</span></p>
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="type"
                    className="block text-sm font-medium leading-6 text-neutral-900"
                  >
                    Guarantee type
                  </label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as CreateGuaranteeInput['itemType'],
                      })
                    }
                    className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6"
                  >
                    <option value="VEHICLE_BOOK">Vehicle book</option>
                    <option value="BIKE">Bike</option>
                    <option value="GOLD">Gold</option>
                    <option value="ELECTRONICS">Electronics</option>
                    <option value="OTHER">Other valuable item</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium leading-6 text-neutral-900"
                  >
                    Description *
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="e.g., Original vehicle book · Honda Dio"
                    className="mt-2 block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                  />
                </div>

                <div>
                  <CurrencyInput
                    label="Estimated value (optional)"
                    value={formData.estimatedValue}
                    onChange={(val) =>
                      setFormData({ ...formData, estimatedValue: val })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                    Photos (optional)
                  </label>
                  <div className="mt-2 flex justify-center rounded-lg border border-dashed border-neutral-300 px-6 py-10 hover:bg-neutral-50 transition-colors cursor-pointer opacity-75">
                    <div className="text-center">
                      <UploadCloudIcon
                        className="mx-auto h-12 w-12 text-neutral-300"
                        aria-hidden="true"
                      />
                      <div className="mt-4 flex text-sm leading-6 text-neutral-600 justify-center">
                        <span className="font-semibold text-brand-600">
                          Upload placeholder
                        </span>
                      </div>
                      <p className="text-xs leading-5 text-neutral-500">
                        Local demo only — attachments later
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="storageLocation"
                    className="block text-sm font-medium leading-6 text-neutral-900"
                  >
                    Storage location *
                  </label>
                  <input
                    type="text"
                    id="storageLocation"
                    value={formData.storageLocation}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        storageLocation: e.target.value,
                      })
                    }
                    placeholder="e.g., Safe Box A1, Cabinet 3"
                    className="mt-2 block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                    Received date *
                  </label>
                  <DatePicker
                    value={formData.receivedDate}
                    onChange={(val) =>
                      setFormData({ ...formData, receivedDate: val })
                    }
                  />
                </div>

                <div>
                  <label
                    htmlFor="notes"
                    className="block text-sm font-medium leading-6 text-neutral-900"
                  >
                    Additional notes
                  </label>
                  <textarea
                    id="notes"
                    rows={2}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="mt-2 block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                  />
                </div>

                <div className="mt-8 rounded-lg bg-neutral-50 p-4 border border-neutral-200">
                  <h4 className="text-sm font-medium text-neutral-900 mb-4 flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-success-500" />
                    Summary
                  </h4>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-neutral-500">Loan</dt>
                      <dd className="font-semibold text-neutral-900 tabular-nums">
                        {selectedLoan?.loanCode ?? '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500">Type</dt>
                      <dd className="font-medium text-neutral-900">
                        {String(formData.type).replace(/_/g, ' ')}
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
                        {formData.storageLocation || '—'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-neutral-200 p-4 z-10">
        <div className="max-w-2xl mx-auto flex justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50"
          >
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </button>
          <button
            type="button"
            onClick={() => void handleNext()}
            disabled={!isStepValid() || isSubmitting}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50"
          >
            {isSubmitting
              ? 'Saving...'
              : currentStep === steps.length - 1
                ? 'Confirm & Save'
                : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
