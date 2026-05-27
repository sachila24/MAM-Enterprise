import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useT } from '../../i18n/I18nProvider';
import { Building2, Globe, Shield, Upload } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
const defaultSettings = {
  businessName: 'M A M Trading',
  regNumber: '',
  address: 'No.47, Galmaduwa, Mahailuppallama',
  phone: '071 593 1681',
  currency: 'LKR',
  language: 'EN',
  receiptFooter: '',
  staffActivityLog: true,
};

export function Settings() {
  const { t } = useT();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(defaultSettings);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      showToast(t('settingsSavedSuccess'), 'success');
    }, 800);
  };
  return (
    <div className="max-w-3xl mx-auto pb-24">
      <PageHeader
        title={t('nav.settings')}
        subtitle={t('settingsSubtitle')} />
      

      <div className="space-y-10 divide-y divide-neutral-200">
        {/* Identity */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3 pt-8 first:pt-0">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-neutral-900">
              {t('settingsIdentity')}
            </h2>
            <p className="mt-1 text-sm leading-6 text-neutral-500">
              {t('settingsIdentityHint')}
            </p>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8 space-y-6">
              <div>
                <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                  {t('companyLogo')}
                </label>
                <div className="flex items-center gap-x-6">
                  <div className="h-16 w-16 rounded-full bg-brand-800 flex items-center justify-center text-white font-bold text-xl tracking-wider">
                    MAM
                  </div>
                  <button
                    type="button"
                    className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50">
                    
                    {t('changeLogo')}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="businessName"
                  className="block text-sm font-medium leading-6 text-neutral-900">
                  
                  {t('businessName')}
                </label>
                <input
                  type="text"
                  id="businessName"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
                
              </div>

              <div>
                <label
                  htmlFor="regNumber"
                  className="block text-sm font-medium leading-6 text-neutral-900">
                  
                  {t('registrationNumber')}
                </label>
                <input
                  type="text"
                  id="regNumber"
                  name="regNumber"
                  value={formData.regNumber}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
                
              </div>

              <div>
                <label
                  htmlFor="address"
                  className="block text-sm font-medium leading-6 text-neutral-900">
                  
                  {t('field.address')}
                </label>
                <textarea
                  id="address"
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
                
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium leading-6 text-neutral-900">
                  
                  {t('contactPhone')}
                </label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
                
              </div>
            </div>
          </div>
        </div>

        {/* Locale & Documents */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3 pt-8">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-neutral-900">
              {t('localeAndDocuments')}
            </h2>
            <p className="mt-1 text-sm leading-6 text-neutral-500">
              {t('localeHint')}
            </p>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="currency"
                    className="block text-sm font-medium leading-6 text-neutral-900">
                    
                    {t('defaultCurrency')}
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6">
                    
                    <option value="LKR">{t('currencyLKR')}</option>
                    <option value="USD">{t('currencyUSD')}</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="language"
                    className="block text-sm font-medium leading-6 text-neutral-900">
                    
                    {t('defaultLanguage')}
                  </label>
                  <select
                    id="language"
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6">
                    
                    <option value="EN">{t('langEnglish')}</option>
                    <option value="SI">{t('langSinhala')}</option>
                    <option value="TA">{t('langTamil')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="receiptFooter"
                  className="block text-sm font-medium leading-6 text-neutral-900">
                  
                  {t('receiptFooterNote')}
                </label>
                <textarea
                  id="receiptFooter"
                  name="receiptFooter"
                  rows={2}
                  value={formData.receiptFooter}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
                
                <p className="mt-1 text-xs text-neutral-500">
                  {t('receiptFooterHint')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3 pt-8">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-neutral-900">
              {t('permissionsSection')}
            </h2>
            <p className="mt-1 text-sm leading-6 text-neutral-500">
              {t('permissionsHint')}
            </p>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium leading-6 text-neutral-900">
                    {t('staffActivityLogAccess')}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    {t('staffActivityLogHint')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    staffActivityLog: !prev.staffActivityLog
                  }))
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 ${formData.staffActivityLog ? 'bg-brand-600' : 'bg-neutral-200'}`}
                  role="switch"
                  aria-checked={formData.staffActivityLog}>
                  
                  <span className="sr-only">{t('useSettingSr')}</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.staffActivityLog ? 'translate-x-5' : 'translate-x-0'}`} />
                  
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-neutral-200 p-4 z-10">
        <div className="max-w-3xl mx-auto flex justify-end gap-x-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50">
            
            {isSubmitting ? t('savingGeneric') : t('saveSettings')}
          </button>
        </div>
      </div>
    </div>);

}