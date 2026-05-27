import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { DatePicker } from '../../components/ui/DatePicker';
import { useToast } from '../../components/ui/Toast';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import { createBike, getBike, updateBike } from '../../lib/local-db/repositories';
import { useT } from '../../i18n/I18nProvider';

export function BikeForm() {
  const { t } = useT();
  const navigate = useNavigate();
  const { id } = useParams();
  const db = useDemoDb();
  const { showToast } = useToast();
  const isEdit = Boolean(id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const clientSubmitIdRef = useRef<string | null>(null);
  const [formData, setFormData] = useState({
    model: '',
    registrationNo: '',
    chassisNo: '',
    engineNo: '',
    year: 0,
    color: '',
    costPrice: 0,
    sellingPrice: 0,
    repairCost: 0,
    otherCost: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    if (isEdit && id) {
      const bike = getBike(id, db);
      if (bike) {
        setFormData({
          model: bike.model,
          registrationNo: bike.registrationNo ?? '',
          chassisNo: bike.chassisNo,
          engineNo: bike.engineNo,
          year: bike.year,
          color: bike.color,
          costPrice: bike.costPrice,
          sellingPrice: bike.sellingPrice,
          repairCost: bike.repairCost,
          otherCost: bike.otherCost,
          purchaseDate: bike.purchaseDate,
          notes: '',
        });
      }
    }
  }, [id, isEdit, db]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'year' ? (value === '' ? 0 : Number(value)) : value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.model.trim()) {
      showToast(t('bikeFormRequiredFields'), 'error');
      return false;
    }
    if (!formData.registrationNo.trim()) {
      showToast(t('registrationRequired'), 'error');
      return false;
    }
    if (formData.costPrice <= 0 || formData.sellingPrice <= 0) {
      showToast(t('bikePricesRequired'), 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (isSubmittingRef.current) return;

    if (!isEdit && !clientSubmitIdRef.current) {
      clientSubmitIdRef.current = crypto.randomUUID();
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      if (isEdit && id) {
        const updated = updateBike(
          id,
          {
            model: formData.model.trim(),
            registration_no: formData.registrationNo.trim(),
            chassis_no: formData.chassisNo.trim(),
            engine_no: formData.engineNo.trim(),
            color: formData.color.trim(),
            year: formData.year || 0,
            cost_price: formData.costPrice,
            selling_price: formData.sellingPrice,
            repair_cost: formData.repairCost,
            other_cost: formData.otherCost,
            purchase_date: formData.purchaseDate,
          },
          db
        );
        if (!updated) {
          throw new Error(t('bikeNotFound'));
        }
        showToast(t('bikeSaved'), 'success');
        navigate(`/bikes/${id}`, { replace: true });
      } else {
        const bike = createBike(
          {
            model: formData.model.trim(),
            registrationNo: formData.registrationNo.trim(),
            chassisNo: formData.chassisNo.trim() || undefined,
            engineNo: formData.engineNo.trim() || undefined,
            color: formData.color.trim() || undefined,
            year: formData.year || undefined,
            costPrice: formData.costPrice,
            sellingPrice: formData.sellingPrice,
            repairCost: formData.repairCost,
            otherCost: formData.otherCost,
            purchaseDate: formData.purchaseDate,
            clientSubmitId: clientSubmitIdRef.current ?? undefined,
          },
          db
        );
        showToast(`${bike.bikeCode} ${t('bikeAdded')}`, 'success');
        navigate(`/bikes/${bike.id}`, { replace: true });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('bikeSaveFailed');
      showToast(message, 'error');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <PageHeader
        title={isEdit ? t('editBike') : t('addBikeToStock')}
        subtitle={isEdit ? t('editBikeSubtitle') : t('addBikeSubtitle')}
      />

      <form onSubmit={handleSubmit} className="space-y-10 divide-y divide-neutral-200">
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 pt-8 first:pt-0">
          <div className="sm:col-span-6">
            <h2 className="text-base font-semibold leading-7 text-neutral-900">
              {t('identification')}
            </h2>
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="model" className="block text-sm font-medium text-neutral-900">
              {t('model')} *
            </label>
            <input
              type="text"
              name="model"
              id="model"
              required
              value={formData.model}
              onChange={handleChange}
              className="mt-2 block w-full rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="registrationNo" className="block text-sm font-medium text-neutral-900">
              {t('registrationNo')} *
            </label>
            <input
              type="text"
              name="registrationNo"
              id="registrationNo"
              required
              value={formData.registrationNo}
              onChange={handleChange}
              className="mt-2 block w-full rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="chassisNo" className="block text-sm font-medium text-neutral-900">
              {t('chassisNumber')}
            </label>
            <input
              type="text"
              name="chassisNo"
              id="chassisNo"
              value={formData.chassisNo}
              onChange={handleChange}
              className="mt-2 block w-full rounded-md border-0 py-1.5 font-mono ring-1 ring-inset ring-neutral-300 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="engineNo" className="block text-sm font-medium text-neutral-900">
              {t('engineNumber')}
            </label>
            <input
              type="text"
              name="engineNo"
              id="engineNo"
              value={formData.engineNo}
              onChange={handleChange}
              className="mt-2 block w-full rounded-md border-0 py-1.5 font-mono ring-1 ring-inset ring-neutral-300 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="year" className="block text-sm font-medium text-neutral-900">
              {t('yearLabel')}
            </label>
            <input
              type="number"
              name="year"
              id="year"
              value={formData.year || ''}
              onChange={handleChange}
              className="mt-2 block w-full rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 sm:text-sm tabular-nums"
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="color" className="block text-sm font-medium text-neutral-900">
              {t('colorLabel')}
            </label>
            <input
              type="text"
              name="color"
              id="color"
              value={formData.color}
              onChange={handleChange}
              className="mt-2 block w-full rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-3">
            <DatePicker
              label={t('purchaseDate')}
              value={formData.purchaseDate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  purchaseDate: e.target.value,
                }))
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 pt-8">
          <div className="sm:col-span-6">
            <h2 className="text-base font-semibold text-neutral-900">{t('financials')}</h2>
          </div>
          <div className="sm:col-span-3">
            <CurrencyInput
              label={`${t('boughtPrice')} *`}
              value={formData.costPrice}
              onChange={(costPrice) => setFormData((p) => ({ ...p, costPrice }))}
            />
          </div>
          <div className="sm:col-span-3">
            <CurrencyInput
              label={`${t('sellingPriceLabel')} *`}
              value={formData.sellingPrice}
              onChange={(sellingPrice) =>
                setFormData((p) => ({ ...p, sellingPrice }))
              }
            />
          </div>
          <div className="sm:col-span-3">
            <CurrencyInput
              label={t('repairCostOptional')}
              value={formData.repairCost}
              onChange={(repairCost) => setFormData((p) => ({ ...p, repairCost }))}
            />
          </div>
          <div className="sm:col-span-3">
            <CurrencyInput
              label={t('otherCostOptional')}
              value={formData.otherCost}
              onChange={(otherCost) => setFormData((p) => ({ ...p, otherCost }))}
            />
          </div>
        </div>
      </form>

      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-neutral-200 p-4 z-10">
        <div className="max-w-2xl mx-auto flex justify-end gap-x-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-neutral-900 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
          >
            {t('action.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50 min-w-[9rem]"
          >
            {isSubmitting
              ? t('savingBike')
              : isEdit
                ? t('saveChanges')
                : t('addToStock')}
          </button>
        </div>
      </div>
    </div>
  );
}

