import React, { useEffect, useState, createContext, useContext } from 'react';
import {
  type DisplayMode,
  type LabelKey,
  getLabel,
  resolveLabel,
  t as labels,
} from '../lib/i18n/simpleLabels';
import { formatMessage, setMessageDisplayMode } from '../lib/i18n/messages';

export type Language = DisplayMode;
export type DictionaryKey = LabelKey;

interface I18nContextType {
  language: DisplayMode;
  setLanguage: (lang: DisplayMode) => void;
  /** Resolve a label key for the current display mode. */
  t: (key: LabelKey) => string;
  /** Alias for `t` — use in components as `label('cashReceived')`. */
  label: (key: LabelKey) => string;
  /** Resolve a raw bilingual string for the current display mode. */
  resolve: (text: string) => string;
  /** Label with `{param}` placeholders for the current display mode. */
  tf: (
    key: LabelKey,
    params?: Record<string, string | number>
  ) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

function normalizeStoredLanguage(value: string | null): DisplayMode {
  if (value === 'en' || value === 'si' || value === 'both') return value;
  // Legacy: separate en/si/ta dictionaries → default to bilingual
  return 'both';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<DisplayMode>(() =>
    normalizeStoredLanguage(localStorage.getItem('language'))
  );

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language === 'si' ? 'si' : 'en';
    setMessageDisplayMode(language);
  }, [language]);

  const resolve = (text: string): string => resolveLabel(text, language);

  const t = (key: LabelKey): string => getLabel(key, language);
  const tf = (
    key: LabelKey,
    params?: Record<string, string | number>
  ): string => formatMessage(key, params, language);

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t,
        label: t,
        resolve,
        tf,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useT must be used within an I18nProvider');
  }
  return context;
}

/** All bilingual label strings (English + Sinhala in brackets). */
export { labels as simpleLabels };
