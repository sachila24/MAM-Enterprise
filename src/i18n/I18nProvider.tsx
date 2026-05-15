import React, { useEffect, useState, createContext, useContext } from 'react';
import { en } from './dictionaries/en';
import { si } from './dictionaries/si';
import { ta } from './dictionaries/ta';
export type Language = 'en' | 'si' | 'ta';
export type DictionaryKey = keyof typeof en;
const dictionaries: Record<Language, typeof en> = {
  en,
  si,
  ta
};
interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: DictionaryKey) => string;
}
const I18nContext = createContext<I18nContextType | null>(null);
export function I18nProvider({ children }: {children: React.ReactNode;}) {
  const [language, setLanguage] = useState<Language>(() => {
    return localStorage.getItem('language') as Language || 'en';
  });
  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);
  const t = (key: DictionaryKey): string => {
    return dictionaries[language][key] || dictionaries['en'][key] || key;
  };
  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t
      }}>
      
      {children}
    </I18nContext.Provider>);

}
export function useT() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useT must be used within an I18nProvider');
  }
  return context;
}