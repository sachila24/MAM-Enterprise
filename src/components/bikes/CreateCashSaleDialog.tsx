import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2Icon, XIcon } from 'lucide-react';
import { CustomerSearchSelect } from '../customers/CustomerSearchSelect';
import { CashSaleInvoicePrint } from '../documents/CashSaleInvoicePrint';
import { CashSalePreviewSummary } from './CashSalePreviewSummary';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Stepper } from '../ui/Stepper';
import { buildCashSaleSnapshot } from '../../lib/documents/snapshots';
import type { DocumentPartySnapshot } from '../../lib/documents/types';
import { formatLKR } from '../../lib/format';
import { roundLKR } from '../../lib/finance/money';
import { listCustomers, completeCashSale } from '../../lib/local-db/repositories';
import type { CompleteCashSaleInput } from '../../lib/local-db/repositories/bikesRepo';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import type { Bike } from '../../types/entities';
import type { PaymentMethod } from '../../types/loan';
import { useT } from '../../i18n/I18nProvider';
import { getSystemToday } from '../../lib/time/systemTime';
import { generateId } from '../../lib/local-db/localDb';
import { getDocumentLabel } from '../../lib/i18n/documentLabels';
import { useToast } from '../ui/Toast';
import { uiError } from '../../lib/i18n/messages';
import { isValidSriLankanPhone } from '../../lib/validation/phone';

export interface CreateCashSaleDialogProps {
  bike: Bike;
  open: boolean;
  onClose: () => void;
  onComplete: (result: { documentId: string; openPrint: boolean }) => void;
}

interface CustomerFormState {
  name: string;
  phone: string;
  nic: string;
  address: string;
}

const EMPTY_CUSTOMER: CustomerFormState = {
  name: '',
  phone: '',
  nic: '',
  address: '',
};

export function CreateCashSaleDialog({
  bike,
  open,
  onClose,
  onComplete,
}: CreateCashSaleDialogProps) {
  const { t, language } = useT();
  const { showToast } = useToast();
  const db = useDemoDb();
  const customers = useMemo(() => listCustomers(db), [db]);
  const staffName = db.profiles[0]?.full_name?.trim() || 'Staff';

  const [step, setStep] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );
  const [customerForm, setCustomerForm] =
    useState<CustomerFormState>(EMPTY_CUSTOMER);
  const [sellingPrice, setSellingPrice] = useState(bike.sellingPrice);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [openPrintAfter, setOpenPrintAfter] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const steps = [
    { id: 'details', label: t('cashSaleDialogTitle') },
    { label: t('stepPreviewInvoice') },
  ];

  const finalAmount = useMemo(
    () => roundLKR(sellingPrice - discountAmount + additionalCharges),
    [sellingPrice, discountAmount, additionalCharges]
  );

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setSelectedCustomerId(null);
    setCustomerForm(EMPTY_CUSTOMER);
    setSellingPrice(bike.sellingPrice);
    setDiscountAmount(0);
    setAdditionalCharges(0);
    setPaymentMethod('CASH');
    setNotes('');
    setOpenPrintAfter(true);
    setIsSubmitting(false);
    isSubmittingRef.current = false;
  }, [open, bike.id, bike.sellingPrice]);

  const handleSelectCustomer = (customerId: string | null) => {
    setSelectedCustomerId(customerId);
    if (!customerId) {
      return;
    }
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setCustomerForm({
        name: customer.name,
        phone: customer.phone,
        nic: customer.nic,
        address: customer.address,
      });
    }
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId(null);
    setCustomerForm(EMPTY_CUSTOMER);
  };

  const handleCustomerFieldChange = (
    field: keyof CustomerFormState,
    value: string
  ) => {
    setCustomerForm((f) => ({ ...f, [field]: value }));
    if (selectedCustomerId) setSelectedCustomerId(null);
  };

  const partySnapshot = useMemo((): DocumentPartySnapshot => {
    const selected = selectedCustomerId
      ? customers.find((c) => c.id === selectedCustomerId)
      : undefined;
    return {
      name: customerForm.name.trim() || '—',
      phone: customerForm.phone.trim() || '—',
      nic: customerForm.nic.trim() || '—',
      address: customerForm.address.trim() || '—',
      customerCode: selected?.customerCode,
    };
  }, [customerForm, customers, selectedCustomerId]);

  const phoneValid =
    !customerForm.phone.trim() ||
    isValidSriLankanPhone(customerForm.phone) ||
    !!selectedCustomerId;

  const previewSnapshot = useMemo(() => {
    if (!open) return null;
    try {
      return buildCashSaleSnapshot(db, bike.id, {
        soldDate: getSystemToday(),
        sellingPrice,
        discountAmount,
        additionalCharges,
        finalAmount,
        paymentMethod,
        notes: notes.trim() || undefined,
        customer: partySnapshot,
        soldBy: staffName,
        createdBy: staffName,
      });
    } catch {
      return null;
    }
  }, [
    open,
    db,
    bike.id,
    sellingPrice,
    discountAmount,
    additionalCharges,
    finalAmount,
    paymentMethod,
    notes,
    partySnapshot,
    staffName,
  ]);

  const canPreview = (): boolean => {
    return (
      customerForm.name.trim().length > 0 &&
      customerForm.phone.trim().length > 0 &&
      phoneValid &&
      sellingPrice > 0 &&
      finalAmount > 0 &&
      discountAmount <= sellingPrice
    );
  };

  const handleConfirm = () => {
    if (isSubmittingRef.current || !canPreview()) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const input: CompleteCashSaleInput = {
        sellingPrice,
        discountAmount,
        additionalCharges,
        paymentMethod,
        notes: notes.trim() || undefined,
        soldDate: getSystemToday(),
        clientSubmitId: generateId(),
      };

      if (selectedCustomerId) {
        input.customerId = selectedCustomerId;
      } else {
        input.customer = {
          name: customerForm.name.trim(),
          phone: customerForm.phone.trim(),
          nic: customerForm.nic.trim() || undefined,
          address: customerForm.address.trim() || undefined,
        };
      }

      const result = completeCashSale(bike.id, input, db);
      onComplete({
        documentId: result.document.id,
        openPrint: openPrintAfter,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : uiError('couldNotUpdateBike');
      showToast(message, 'error');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cash-sale-dialog-title"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-neutral-200"
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-4">
          <div>
            <h2
              id="cash-sale-dialog-title"
              className="text-lg font-semibold text-neutral-900"
            >
              {t('cashSaleDialogTitle')}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {bike.bikeCode} · {bike.model} — {t('cashSaleDialogSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-50"
            aria-label={t('action.cancel')}
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <Stepper steps={steps} current={step} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-4 lg:flex-row">
          <div className="min-w-0 flex-1 space-y-6">
            {step === 0 && (
              <>
                <section className="rounded-xl ring-1 ring-neutral-200 p-5">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-4">
                    {getDocumentLabel('customerDetails', language)}
                  </h3>
                  <CustomerSearchSelect
                    customers={customers}
                    selectedCustomerId={selectedCustomerId}
                    onSelect={handleSelectCustomer}
                  />
                  {!selectedCustomerId && (
                    <p className="mt-3 text-xs text-neutral-500">
                      {t('newWalkInCustomer')}
                    </p>
                  )}
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label={`${t('field.customer')} *`}
                      value={customerForm.name}
                      onChange={(v) => handleCustomerFieldChange('name', v)}
                      disabled={!!selectedCustomerId}
                    />
                    <div>
                      <Field
                        label={`${t('field.phone')} *`}
                        value={customerForm.phone}
                        onChange={(v) => handleCustomerFieldChange('phone', v)}
                        disabled={!!selectedCustomerId}
                        error={
                          customerForm.phone.trim() && !phoneValid
                            ? t('invalidSriLankanPhone')
                            : undefined
                        }
                      />
                    </div>
                    <Field
                      label={t('colNic')}
                      value={customerForm.nic}
                      onChange={(v) => handleCustomerFieldChange('nic', v)}
                      disabled={!!selectedCustomerId}
                    />
                    <Field
                      label={t('field.address')}
                      value={customerForm.address}
                      onChange={(v) => handleCustomerFieldChange('address', v)}
                      disabled={!!selectedCustomerId}
                    />
                  </div>
                  {selectedCustomerId && (
                    <button
                      type="button"
                      onClick={handleClearCustomer}
                      className="mt-3 text-sm font-semibold text-brand-700 hover:text-brand-600"
                    >
                      {t('newWalkInCustomer')}
                    </button>
                  )}
                </section>

                <section className="rounded-xl ring-1 ring-neutral-200 p-5">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-4">
                    {t('saleDetailsSection')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CurrencyInput
                      label={`${t('sellingPriceLabel')} *`}
                      value={sellingPrice}
                      onChange={setSellingPrice}
                    />
                    <CurrencyInput
                      label={t('discount')}
                      value={discountAmount}
                      onChange={setDiscountAmount}
                    />
                    <CurrencyInput
                      label={t('additionalCharges')}
                      value={additionalCharges}
                      onChange={setAdditionalCharges}
                    />
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        {t('finalAmount')}
                      </label>
                      <p className="rounded-md bg-neutral-50 px-3 py-2.5 text-lg font-semibold tabular-nums text-brand-700 ring-1 ring-neutral-200">
                        {formatLKR(finalAmount)}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl ring-1 ring-neutral-200 p-5">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-4">
                    {t('paymentSection')}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        {t('paymentMethod')} *
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) =>
                          setPaymentMethod(e.target.value as PaymentMethod)
                        }
                        className="block w-full rounded-md border-0 py-2 pl-3 pr-8 text-sm ring-1 ring-inset ring-neutral-300 bg-white"
                      >
                        <option value="CASH">{t('statusCash')}</option>
                        <option value="CHEQUE">{t('statusCheque')}</option>
                        <option value="BANK_TRANSFER">
                          {t('statusBankTransfer')}
                        </option>
                        <option value="OTHER">{t('statusOther')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        {t('additionalNotes')}
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="block w-full rounded-md border-0 py-2 px-3 text-sm ring-1 ring-inset ring-neutral-300"
                        placeholder={t('additionalNotes')}
                      />
                    </div>
                  </div>
                </section>
              </>
            )}

            {step === 1 && previewSnapshot && (
              <section className="space-y-5">
                <CashSalePreviewSummary
                  prominent
                  bike={bike}
                  customerName={customerForm.name.trim()}
                  sellingPrice={sellingPrice}
                  discountAmount={discountAmount}
                  additionalCharges={additionalCharges}
                  finalAmount={finalAmount}
                  paymentMethod={paymentMethod}
                  soldBy={staffName}
                />
                <div className="overflow-x-auto rounded-lg ring-1 ring-neutral-200 bg-white p-2 no-print">
                  <p className="px-2 pt-1 pb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {t('previewInvoice')}
                  </p>
                  <div className="mx-auto max-w-[176mm] origin-top">
                    <CashSaleInvoicePrint
                      documentNumber={`CS-${new Date().getFullYear()}-DRAFT`}
                      createdAt={new Date().toISOString()}
                      snapshot={previewSnapshot}
                      language={language}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={openPrintAfter}
                    onChange={(e) => setOpenPrintAfter(e.target.checked)}
                    disabled={isSubmitting}
                    className="rounded border-neutral-300 text-brand-600 focus:ring-brand-600"
                  />
                  {t('openPrintAfterSale')}
                </label>
                {openPrintAfter && (
                  <p className="text-xs text-neutral-500 -mt-2 pl-6">
                    {t('printPaperHintCashSale')}
                  </p>
                )}
              </section>
            )}
          </div>

          <aside className="w-full shrink-0 lg:w-80 lg:sticky lg:top-4 lg:self-start">
            {step === 0 ? (
              <CashSalePreviewSummary
                bike={bike}
                customerName={customerForm.name.trim()}
                sellingPrice={sellingPrice}
                discountAmount={discountAmount}
                additionalCharges={additionalCharges}
                finalAmount={finalAmount}
                paymentMethod={paymentMethod}
              />
            ) : null}
          </aside>
        </div>

        <div className="flex justify-between gap-3 border-t border-neutral-200 px-6 py-4">
          <button
            type="button"
            onClick={() => {
              if (step === 0) onClose();
              else setStep(0);
            }}
            disabled={isSubmitting}
            className="text-sm font-semibold text-neutral-900 disabled:opacity-50"
          >
            {step === 0 ? t('action.cancel') : t('action.back')}
          </button>
          <button
            type="button"
            disabled={!canPreview() || isSubmitting}
            onClick={() => {
              if (step === 0) setStep(1);
              else handleConfirm();
            }}
            className={`inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed min-w-[10rem] ${
              step === 1
                ? 'bg-success-600 hover:bg-success-500'
                : 'bg-brand-600 hover:bg-brand-500'
            }`}
          >
            {isSubmitting && (
              <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden />
            )}
            {isSubmitting
              ? t('savingGeneric')
              : step === 0
                ? t('previewInvoice')
                : t('confirmCompleteCashSale')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-neutral-700 mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className={`block w-full rounded-md border-0 py-2 px-3 text-sm ring-1 ring-inset disabled:bg-neutral-50 disabled:text-neutral-600 ${
          error
            ? 'ring-danger-300 focus:ring-danger-500'
            : 'ring-neutral-300 focus:ring-brand-600'
        }`}
      />
      {error && (
        <p className="mt-1 text-xs text-danger-600">{error}</p>
      )}
    </div>
  );
}
