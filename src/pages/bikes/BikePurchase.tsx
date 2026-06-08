import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2Icon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Stepper } from '../../components/ui/Stepper';
import { CustomerSearchSelect } from '../../components/customers/CustomerSearchSelect';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { DatePicker } from '../../components/ui/DatePicker';
import { BikePurchaseReceiptPrint } from '../../components/documents/BikePurchaseReceiptPrint';
import { useToast } from '../../components/ui/Toast';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import {
  completeBikePurchase,
  hasSoldBikeHistoryForRegistration,
  isRegistrationUsedByActiveBike,
  listCustomers,
} from '../../lib/local-db/repositories';
import type { CompleteBikePurchaseInput } from '../../lib/local-db/repositories/bikesRepo';
import { buildBikePurchasePreviewSnapshot } from '../../lib/documents/snapshots';
import type {
  DocumentBikeSnapshot,
  DocumentPartySnapshot,
} from '../../lib/documents/types';
import { formatLKR } from '../../lib/format';
import { roundLKR } from '../../lib/finance/money';
import type { PaymentMethod } from '../../types/loan';
import { useT } from '../../i18n/I18nProvider';
import { getDocumentLabel } from '../../lib/i18n/documentLabels';
import { isValidSriLankanPhone } from '../../lib/validation/phone';
import { getSystemToday, normalizeDate } from '../../lib/time/systemTime';

const CURRENT_YEAR = new Date().getFullYear();
const BIKE_YEAR_OPTIONS = Array.from({ length: 41 }, (_, i) => CURRENT_YEAR - i);

interface SellerFormState {
  name: string;
  phone: string;
  nic: string;
  address: string;
  notes: string;
}

const EMPTY_SELLER: SellerFormState = {
  name: '',
  phone: '',
  nic: '',
  address: '',
  notes: '',
};

function draftBikeSnapshot(
  model: string,
  registrationNo: string,
  chassisNo: string,
  engineNo: string,
  color: string,
  year: number,
  sellingPrice: number
): DocumentBikeSnapshot {
  const trimmedModel = model.trim();
  const modelParts = trimmedModel.split(/\s+/);
  const brand = modelParts.length > 1 ? modelParts[0] : '—';
  return {
    bikeCode: 'DRAFT',
    model: trimmedModel || '—',
    brand,
    color: color.trim() || '—',
    year: year || 0,
    chassisNo: chassisNo.trim() || '—',
    engineNo: engineNo.trim() || '—',
    registrationNo: registrationNo.trim() || '—',
    sellingPrice,
  };
}

export function BikePurchase() {
  const { t, language } = useT();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const db = useDemoDb();
  const customers = useMemo(() => listCustomers(db), [db]);
  const staffName = db.profiles[0]?.full_name?.trim() || 'Staff';

  const steps = [
    { id: 'seller', label: t('stepSeller') },
    { label: t('stepBikeInfo') },
    { label: t('stepPurchaseAndPayment') },
    { label: t('stepPreviewConfirm') },
  ];

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const clientSubmitIdRef = useRef<string | null>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );
  const [sellerForm, setSellerForm] = useState<SellerFormState>(EMPTY_SELLER);

  const [model, setModel] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [chassisNo, setChassisNo] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [year, setYear] = useState(0);
  const [color, setColor] = useState('');

  const [purchasePrice, setPurchasePrice] = useState(0);
  const [repairCost, setRepairCost] = useState(0);
  const [transportCost, setTransportCost] = useState(0);
  const [documentCost, setDocumentCost] = useState(0);
  const [otherCost, setOtherCost] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [purchaseDate, setPurchaseDate] = useState(getSystemToday());
  const [purchaseNotes, setPurchaseNotes] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [openPrintAfter, setOpenPrintAfter] = useState(true);

  const showsPaymentReference =
    paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'CHEQUE';
  const showsPaymentNotes = paymentMethod !== 'CASH';

  const paymentReferenceLabel =
    paymentMethod === 'BANK_TRANSFER'
      ? t('transferReference')
      : paymentMethod === 'CHEQUE'
        ? t('purchaseChequeNumber')
        : '';

  useEffect(() => {
    if (paymentMethod === 'CASH') {
      setPaymentReference('');
      setPaymentNotes('');
    }
  }, [paymentMethod]);

  const [showPreviouslySoldNotice, setShowPreviouslySoldNotice] = useState(false);

  useEffect(() => {
    const registration = registrationNo.trim();
    if (!registration) {
      setShowPreviouslySoldNotice(false);
      return;
    }
    setShowPreviouslySoldNotice(
      hasSoldBikeHistoryForRegistration(db, registration) &&
        !isRegistrationUsedByActiveBike(db, registration)
    );
  }, [db, registrationNo]);

  const handleSelectCustomer = (customerId: string | null) => {
    setSelectedCustomerId(customerId);
    if (!customerId) return;
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setSellerForm({
        name: customer.name,
        phone: customer.phone,
        nic: customer.nic,
        address: customer.address,
        notes: sellerForm.notes,
      });
    }
  };

  const handleSellerFieldChange = (
    field: keyof SellerFormState,
    value: string
  ) => {
    setSellerForm((f) => ({ ...f, [field]: value }));
    if (selectedCustomerId) setSelectedCustomerId(null);
  };

  const partySnapshot = useMemo((): DocumentPartySnapshot => {
    const selected = selectedCustomerId
      ? customers.find((c) => c.id === selectedCustomerId)
      : undefined;
    return {
      name: sellerForm.name.trim() || '—',
      phone: sellerForm.phone.trim() || '—',
      nic: sellerForm.nic.trim() || '—',
      address: sellerForm.address.trim() || '—',
      customerCode: selected?.customerCode,
    };
  }, [sellerForm, customers, selectedCustomerId]);

  const phoneValid =
    !sellerForm.phone.trim() ||
    isValidSriLankanPhone(sellerForm.phone) ||
    !!selectedCustomerId;

  const totalPaidAmount = useMemo(
    () => roundLKR(purchasePrice),
    [purchasePrice]
  );

  const additionalCostsTotal = useMemo(
    () =>
      roundLKR(repairCost + transportCost + documentCost + otherCost),
    [repairCost, transportCost, documentCost, otherCost]
  );

  const previewSnapshot = useMemo(() => {
    try {
      return buildBikePurchasePreviewSnapshot({
        purchaseDate,
        seller: partySnapshot,
        bike: draftBikeSnapshot(
          model,
          registrationNo,
          chassisNo,
          engineNo,
          color,
          year,
          sellingPrice
        ),
        purchasePrice,
        repairCost,
        transportCost,
        documentCost,
        otherCost,
        totalPaidAmount,
        expectedSellingPrice: sellingPrice,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        paymentNotes: paymentNotes.trim() || undefined,
        purchaseNotes:
          [purchaseNotes.trim(), sellerForm.notes.trim()]
            .filter(Boolean)
            .join('\n') || undefined,
        handledBy: staffName,
      });
    } catch {
      return null;
    }
  }, [
    purchaseDate,
    partySnapshot,
    model,
    registrationNo,
    chassisNo,
    engineNo,
    color,
    year,
    sellingPrice,
    purchasePrice,
    repairCost,
    transportCost,
    documentCost,
    otherCost,
    totalPaidAmount,
    paymentMethod,
    paymentReference,
    paymentNotes,
    purchaseNotes,
    sellerForm.notes,
    staffName,
  ]);

  const validateStep = (step: number): string | null => {
    if (step === 0) {
      if (selectedCustomerId) return null;
      if (!sellerForm.name.trim() || !sellerForm.phone.trim()) {
        return t('bikePurchaseSellerRequired');
      }
      if (!phoneValid) return t('invalidSriLankanPhone');
      return null;
    }
    if (step === 1) {
      if (!model.trim()) return t('bikeFormRequiredFields');
      if (!registrationNo.trim()) return t('registrationRequired');
      return null;
    }
    if (step === 2) {
      if (purchasePrice <= 0 || sellingPrice <= 0) {
        return t('bikePricesRequired');
      }
      return null;
    }
    return null;
  };

  const handleNext = () => {
    if (isSubmitting) return;
    const err = validateStep(currentStep);
    if (err) {
      showToast(err, 'error');
      return;
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      return;
    }
    handleConfirm();
  };

  const handleConfirm = () => {
    if (isSubmittingRef.current) return;
    const err = [0, 1, 2].map(validateStep).find(Boolean);
    if (err) {
      showToast(err, 'error');
      return;
    }

    if (!clientSubmitIdRef.current) {
      clientSubmitIdRef.current = crypto.randomUUID();
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const combinedNotes = [purchaseNotes.trim(), sellerForm.notes.trim()]
        .filter(Boolean)
        .join('\n');

      const input: CompleteBikePurchaseInput = {
        model: model.trim(),
        registrationNo: registrationNo.trim(),
        chassisNo: chassisNo.trim() || undefined,
        engineNo: engineNo.trim() || undefined,
        color: color.trim() || undefined,
        year: year || undefined,
        purchasePrice,
        repairCost,
        transportCost,
        documentCost,
        otherCost,
        sellingPrice,
        purchaseDate: normalizeDate(purchaseDate),
        purchaseNotes: combinedNotes || undefined,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        paymentNotes: paymentNotes.trim() || undefined,
        clientSubmitId: clientSubmitIdRef.current,
      };

      if (selectedCustomerId) {
        input.customerId = selectedCustomerId;
      } else {
        input.customer = {
          name: sellerForm.name.trim(),
          phone: sellerForm.phone.trim(),
          nic: sellerForm.nic.trim() || undefined,
          address: sellerForm.address.trim() || undefined,
        };
      }

      const result = completeBikePurchase(input, db);
      showToast(
        `${result.bike.bikeCode} — ${t('bikePurchaseCompleted')}`,
        'success'
      );
      const printQuery = openPrintAfter ? '?print=1' : '';
      navigate(`/documents/${result.document.id}${printQuery}`, {
        replace: true,
      });
    } catch (submitErr) {
      const message =
        submitErr instanceof Error
          ? submitErr.message
          : t('bikeSaveFailed');
      showToast(message, 'error');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (isSubmitting) return;
    if (currentStep > 0) setCurrentStep(currentStep - 1);
    else navigate('/bikes');
  };

  return (
    <div className="max-w-7xl mx-auto pb-16">
      <PageHeader
        title={t('bikePurchase')}
        subtitle={t('bikePurchaseSubtitle')}
      />

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
                    {t('sellerDetails')}
                  </h3>
                  <CustomerSearchSelect
                    customers={customers}
                    selectedCustomerId={selectedCustomerId}
                    onSelect={handleSelectCustomer}
                  />
                  {!selectedCustomerId && (
                    <p className="text-sm text-neutral-600">
                      {t('newWalkInCustomer')}
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-neutral-900">
                        {getDocumentLabel('customerName', language)} *
                      </label>
                      <input
                        type="text"
                        value={sellerForm.name}
                        onChange={(e) =>
                          handleSellerFieldChange('name', e.target.value)
                        }
                        className="mt-2 block w-full rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-900">
                        {getDocumentLabel('phone', language)} *
                      </label>
                      <input
                        type="tel"
                        value={sellerForm.phone}
                        onChange={(e) =>
                          handleSellerFieldChange('phone', e.target.value)
                        }
                        className="mt-2 block w-full rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-900">
                        {getDocumentLabel('nic', language)}
                      </label>
                      <input
                        type="text"
                        value={sellerForm.nic}
                        onChange={(e) =>
                          handleSellerFieldChange('nic', e.target.value)
                        }
                        className="mt-2 block w-full rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 sm:text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-neutral-900">
                        {getDocumentLabel('address', language)}
                      </label>
                      <textarea
                        value={sellerForm.address}
                        onChange={(e) =>
                          handleSellerFieldChange('address', e.target.value)
                        }
                        rows={2}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 sm:text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-neutral-900">
                        {t('purchaseNotes')}
                      </label>
                      <textarea
                        value={sellerForm.notes}
                        onChange={(e) =>
                          handleSellerFieldChange('notes', e.target.value)
                        }
                        rows={2}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-neutral-900">
                    {getDocumentLabel('bikeDetails', language)}
                  </h3>
                  {showPreviouslySoldNotice && (
                    <div className="rounded-lg bg-brand-50 ring-1 ring-brand-200 p-4 text-sm text-brand-900">
                      {t('previouslySoldRegistrationNotice')}
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-neutral-900">
                        {t('model')} *
                      </label>
                      <input
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-900">
                        {t('registrationNo')} *
                      </label>
                      <input
                        type="text"
                        value={registrationNo}
                        onChange={(e) => setRegistrationNo(e.target.value)}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-900">
                        {t('chassisNumber')}
                      </label>
                      <input
                        type="text"
                        value={chassisNo}
                        onChange={(e) => setChassisNo(e.target.value)}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 font-mono ring-1 ring-inset ring-neutral-300 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-900">
                        {t('engineNumber')}
                      </label>
                      <input
                        type="text"
                        value={engineNo}
                        onChange={(e) => setEngineNo(e.target.value)}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 font-mono ring-1 ring-inset ring-neutral-300 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-900">
                        {t('yearLabel')}
                      </label>
                      <select
                        value={year || ''}
                        onChange={(e) =>
                          setYear(e.target.value === '' ? 0 : Number(e.target.value))
                        }
                        className="mt-2 block w-full rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 sm:text-sm tabular-nums"
                      >
                        <option value="">{t('selectYear')}</option>
                        {BIKE_YEAR_OPTIONS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-900">
                        {t('colorLabel')}
                      </label>
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-8">
                  <section className="space-y-4">
                    <h3 className="text-lg font-medium text-neutral-900">
                      {t('purchaseFinancialDetails')}
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <CurrencyInput
                        label={`${t('purchasePrice')} *`}
                        value={purchasePrice}
                        onChange={setPurchasePrice}
                      />
                      <CurrencyInput
                        label={t('repairCostEstimate')}
                        value={repairCost}
                        onChange={setRepairCost}
                      />
                      <CurrencyInput
                        label={t('transportCost')}
                        value={transportCost}
                        onChange={setTransportCost}
                      />
                      <CurrencyInput
                        label={t('documentCost')}
                        value={documentCost}
                        onChange={setDocumentCost}
                      />
                      <CurrencyInput
                        label={t('otherCost')}
                        value={otherCost}
                        onChange={setOtherCost}
                      />
                      <CurrencyInput
                        label={`${t('expectedSellingPrice')} *`}
                        value={sellingPrice}
                        onChange={setSellingPrice}
                      />
                      <div>
                        <DatePicker
                          label={`${t('purchaseDate')} *`}
                          value={purchaseDate}
                          onChange={(e) => setPurchaseDate(e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-neutral-900">
                          {t('purchaseNotes')}
                        </label>
                        <textarea
                          value={purchaseNotes}
                          onChange={(e) => setPurchaseNotes(e.target.value)}
                          rows={2}
                          className="mt-2 block w-full rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 sm:text-sm"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4 border-t border-neutral-200 pt-6">
                    <h3 className="text-base font-medium text-neutral-900">
                      {t('paymentSection')}
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-neutral-900 mb-1">
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
                        </select>
                      </div>
                      {showsPaymentReference && (
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-neutral-900 mb-1">
                            {paymentReferenceLabel}
                          </label>
                          <input
                            type="text"
                            value={paymentReference}
                            onChange={(e) =>
                              setPaymentReference(e.target.value)
                            }
                            className="block w-full rounded-md border-0 py-2 px-3 text-sm ring-1 ring-inset ring-neutral-300"
                          />
                        </div>
                      )}
                      {showsPaymentNotes && (
                        <div className="sm:col-span-2">
                          <details className="rounded-md ring-1 ring-neutral-200 bg-neutral-50/60 open:bg-white">
                            <summary className="cursor-pointer select-none px-3 py-2.5 text-xs font-medium text-neutral-500 hover:text-neutral-700 [&::-webkit-details-marker]:hidden list-none">
                              <span className="inline-flex items-center gap-1">
                                <span aria-hidden className="text-neutral-400">
                                  +
                                </span>
                                {t('paymentNotesOptional')}
                              </span>
                            </summary>
                            <div className="border-t border-neutral-200 px-3 pb-3 pt-2">
                              <textarea
                                value={paymentNotes}
                                onChange={(e) =>
                                  setPaymentNotes(e.target.value)
                                }
                                rows={2}
                                placeholder={t('paymentNotesOptional')}
                                className="block w-full rounded-md border-0 py-2 px-3 text-sm text-neutral-700 ring-1 ring-inset ring-neutral-200 bg-white placeholder:text-neutral-400"
                              />
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              )}

              {currentStep === 3 && previewSnapshot && (
                <div className="space-y-5">
                  <h3 className="text-lg font-medium text-neutral-900">
                    {t('stepPreviewReceipt')}
                  </h3>
                  <dl className="divide-y divide-neutral-200 text-sm rounded-lg ring-1 ring-neutral-200 px-4">
                    <div className="py-2 flex justify-between gap-4">
                      <dt className="text-neutral-500">{t('sellerDetails')}</dt>
                      <dd className="font-medium text-right">
                        {partySnapshot.name}
                      </dd>
                    </div>
                    <div className="py-2 flex justify-between gap-4">
                      <dt className="text-neutral-500">{t('registrationNo')}</dt>
                      <dd className="font-medium tabular-nums">
                        {registrationNo.trim()}
                      </dd>
                    </div>
                    <div className="py-2 flex justify-between gap-4">
                      <dt className="text-neutral-500">{t('totalPaidAmount')}</dt>
                      <dd className="font-semibold text-brand-700 tabular-nums">
                        {formatLKR(totalPaidAmount)}
                      </dd>
                    </div>
                    <div className="py-2 flex justify-between gap-4">
                      <dt className="text-neutral-500">{t('paymentMethod')}</dt>
                      <dd className="font-medium">{paymentMethod}</dd>
                    </div>
                  </dl>
                  <div className="overflow-x-auto rounded-lg ring-1 ring-neutral-200 bg-white p-2 no-print">
                    <p className="px-2 pt-1 pb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {t('stepPreviewReceipt')}
                    </p>
                    <div className="mx-auto max-w-[176mm] origin-top">
                      <BikePurchaseReceiptPrint
                        documentNumber={`BP-${new Date().getFullYear()}-DRAFT`}
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
                      className="h-4 w-4 rounded border-neutral-300 text-brand-600"
                    />
                    {t('openPrintAfterPurchase')}
                  </label>
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
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 min-w-[10rem]"
            >
              {isSubmitting && (
                <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden />
              )}
              {isSubmitting
                ? t('confirmBikePurchase')
                : currentStep === steps.length - 1
                  ? t('confirmBikePurchase')
                  : t('action.next')}
            </button>
          </div>
        </div>

        <div className="flex-1 lg:max-w-[40%] w-full lg:self-start">
          <div className="lg:sticky lg:top-24">
            <div className="bg-brand-800 rounded-xl shadow-lg text-white p-6">
              <h3 className="text-lg font-medium mb-4 text-brand-50">
                {t('purchaseFinancialDetails')}
              </h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-brand-200">{t('purchasePrice')}</dt>
                  <dd className="tabular-nums font-medium">
                    {formatLKR(purchasePrice)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-brand-200">{t('repairCostEstimate')}</dt>
                  <dd className="tabular-nums">{formatLKR(repairCost)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-brand-200">{t('transportCost')}</dt>
                  <dd className="tabular-nums">{formatLKR(transportCost)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-brand-200">{t('documentCost')}</dt>
                  <dd className="tabular-nums">{formatLKR(documentCost)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-brand-200">{t('otherCost')}</dt>
                  <dd className="tabular-nums">{formatLKR(otherCost)}</dd>
                </div>
                <div className="flex justify-between gap-4 pt-2 border-t border-brand-700">
                  <dt className="text-brand-100 font-medium">
                    {t('totalPaidAmount')}
                  </dt>
                  <dd className="tabular-nums font-semibold text-lg">
                    {formatLKR(totalPaidAmount)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-brand-200">{t('expectedSellingPrice')}</dt>
                  <dd className="tabular-nums">{formatLKR(sellingPrice)}</dd>
                </div>
                {additionalCostsTotal > 0 && (
                  <div className="flex justify-between gap-4 text-brand-300 text-xs pt-1">
                    <dt>{t('repairAndOther')}</dt>
                    <dd className="tabular-nums">
                      {formatLKR(additionalCostsTotal)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
