import { useEffect } from 'react';
import { useT } from '../../i18n/I18nProvider';
import { setFormatDisplayMode } from '../../lib/format';

/** Keeps formatEnum in sync with the language display mode. */
export function FormatModeSync() {
  const { language } = useT();

  useEffect(() => {
    setFormatDisplayMode(language);
  }, [language]);

  return null;
}
