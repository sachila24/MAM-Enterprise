import React from 'react';
import { useT, type Language } from '../../i18n/I18nProvider';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useT();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language);
  };

  return (
    <select
      value={language}
      onChange={handleLanguageChange}
      className="block w-28 rounded-md border-0 py-1.5 pl-3 pr-8 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 bg-white"
      aria-label={t('displayLanguage')}
    >
      <option value="en">{t('langModeEnglish')}</option>
      <option value="si">{t('langModeSinhala')}</option>
    </select>
  );
}
