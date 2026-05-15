import React from 'react';
import { useT, Language } from '../../i18n/I18nProvider';
export function LanguageSwitcher() {
  const { language, setLanguage } = useT();
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language);
  };
  return (
    <select
      value={language}
      onChange={handleLanguageChange}
      className="block w-24 rounded-md border-0 py-1.5 pl-3 pr-8 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 bg-white">
      
      <option value="en">EN</option>
      <option value="si">සිංහල</option>
      <option value="ta">தமிழ்</option>
    </select>);

}