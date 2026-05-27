import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { CustomerSearchSelect } from '../../components/customers/CustomerSearchSelect';
import { Stepper } from '../../components/ui/Stepper';
import { useToast } from '../../components/ui/Toast';
import { formatLKR } from '../../lib/format';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import {
  createGuarantee,
  listCustomers,
  listLoans,
} from '../../lib/local-db/repositories';
import {
  emptyGuaranteeDraft,
  hasGuaranteeDraftContent,
  type GuaranteeFieldValues,
} from '../../lib/guarantee/guaranteeFields';
import { GuaranteeFieldsForm } from '../../components/guarantees/GuaranteeFieldsForm';
import { useT } from '../../i18n/I18nProvider';

export function AddGuarantee() {
  const { t } = useT();
  const navigate = useNavigate();

  const steps = [
    { id: 'customer', label: t('stepCustomer') },
    { label: t('stepLoan') },
    { label: t('guaranteeInformation') },
    { label: t('stepConfirm') },
  ];
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
    guarantee: emptyGuaranteeDraft(),
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
      const fields: GuaranteeFieldValues = formData.guarantee;
      const trim = (s: string) => s.trim() || undefined;
      const g = createGuarantee(
        {
          loanId: selectedLoan.id,
          customerId: selectedLoan.customerId,
          fileNumber: trim(fields.fileNumber),
          vehicleNumber: trim(fields.vehicleNumber),
          guarantor1Name: trim(fields.guarantor1Name),
          guarantor1Address: trim(fields.guarantor1Address),
          guarantor1Phone: trim(fields.guarantor1Phone),
          guarantor1Nic: trim(fields.guarantor1Nic),
          guarantor2Name: trim(fields.guarantor2Name),
          guarantor2Address: trim(fields.guarantor2Address),
          guarantor2Phone: trim(fields.guarantor2Phone),
          guarantor2Nic: trim(fields.guarantor2Nic),
        },
        db
      );
      if (!hasGuaranteeDraftContent(fields)) {
        showToast(t('guaranteeOptionalHint'), 'info');
      }
      showToast(`${g.guaranteeCode} ${t('guaranteeSaved')}`, 'success');
      navigate(`/guarantees/${g.id}`, { replace: true });
    } catch {
      showToast(t('guaranteeSaveFailed'), 'error');
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
        title={t('addGuaranteeTitle')}
        subtitle={t('addGuaranteeSubtitle')}
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
                <CustomerSearchSelect
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
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="loanId" className="block text-sm font-medium leading-6 text-neutral-900">{t('selectLoan')} *</label>
                  <select id="loanId" value={formData.loanId} onChange={(e) => setFormData({ ...formData, loanId: e.target.value })} disabled={!formData.customerId} className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 disabled:bg-neutral-50">
                    <option value="">{formData.customerId ? t('selectActiveLoan') : t('selectCustomerFirst')}</option>
                    {customerLoans.map((loan) => (<option key={loan.id} value={loan.id}>{loan.loanCode} · {formatLKR(loan.balanceAmount)}</option>))}
                  </select>
                </div>
                {selectedLoan && (
                  <div className="rounded-lg bg-brand-50 p-4 border border-brand-100 text-sm">
                    <p className="text-brand-700">{t('loanSummaryPrefix')} <span className="font-semibold text-brand-900 tabular-nums">{selectedLoan.loanCode}</span></p>
                    <p className="text-brand-700 mt-1">{t('loanBalanceSummary')} <span className="font-medium tabular-nums">{formatLKR(selectedLoan.balanceAmount)}</span></p>
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-neutral-600">{t('guaranteeOptionalHint')}</p>
                <GuaranteeFieldsForm
                  values={formData.guarantee}
                  onChange={(patch) =>
                    setFormData((f) => ({
                      ...f,
                      guarantee: { ...f.guarantee, ...patch },
                    }))
                  }
                />
              </div>
            )}

            {currentStep === 3 && (
              <div className="rounded-lg bg-neutral-50 p-4 border border-neutral-200">
                <h4 className="text-sm font-medium text-neutral-900 mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-success-500" />
                  {t('summaryTitle')}
                </h4>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-neutral-500">{t('field.loan')}</dt>
                    <dd className="font-semibold text-neutral-900 tabular-nums">
                      {selectedLoan?.loanCode ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">{t('fileNumber')}</dt>
                    <dd className="font-medium text-neutral-900">
                      {formData.guarantee.fileNumber || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">{t('vehicleNumber')}</dt>
                    <dd className="font-medium text-neutral-900">
                      {formData.guarantee.vehicleNumber || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">{t('guarantor1')}</dt>
                    <dd className="font-medium text-neutral-900">
                      {formData.guarantee.guarantor1Name || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">{t('guarantor2')}</dt>
                    <dd className="font-medium text-neutral-900">
                      {formData.guarantee.guarantor2Name || '—'}
                    </dd>
                  </div>
                </dl>
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
            {currentStep === 0 ? t('action.cancel') : t('action.back')}
          </button>
          <button
            type="button"
            onClick={() => void handleNext()}
            disabled={!isStepValid() || isSubmitting}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50"
          >
            {isSubmitting
              ? t('savingGeneric')
              : currentStep === steps.length - 1
                ? t('confirmAndSave')
                : t('action.next')}
          </button>
        </div>
      </div>
    </div>
  );
}
