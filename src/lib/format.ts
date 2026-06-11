import {
  ENUM_LABEL_KEYS,
  getLabel,
  type DisplayMode,
} from './i18n/simpleLabels';

let formatDisplayMode: DisplayMode = 'both';

/** Set display mode for formatEnum (call from I18nProvider consumers via hook). */
export function setFormatDisplayMode(mode: DisplayMode): void {
  formatDisplayMode = mode;
}

export function getFormatDisplayMode(): DisplayMode {
  return formatDisplayMode;
}

export function formatEnum(
  value: string | null | undefined,
  mode: DisplayMode = formatDisplayMode
): string {
  if (!value || value === '__unset__') return '—';

  const upper = value.toUpperCase();
  const key =
    ENUM_LABEL_KEYS[value] ??
    ENUM_LABEL_KEYS[upper] ??
    ENUM_LABEL_KEYS[value.toLowerCase()];
  if (key) return getLabel(key, mode);

  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function formatLKR(
  amount: number,
  opts?: { withSymbol?: boolean }
): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'LKR 0';

  const formatted = Math.round(amount).toLocaleString('en-US');
  return opts?.withSymbol === false ? formatted : `LKR ${formatted}`;
}

function localeForMode(mode: DisplayMode): string {
  if (mode === 'si') return 'si-LK';
  return 'en-GB';
}

export function formatDate(
  date: Date | string,
  format: 'short' | 'long' = 'short',
  mode: DisplayMode = formatDisplayMode
): string {
  if (!date) return '—';
  const d = new Date(date);
  const locale = localeForMode(mode);

  return d.toLocaleDateString(locale, {
    day: format === 'long' ? 'numeric' : '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(
  date: Date | string,
  mode: DisplayMode = formatDisplayMode
): string {
  if (!date) return '—';
  const d = new Date(date);
  const locale = localeForMode(mode);

  const datePart = d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const timePart = d.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${datePart}, ${timePart}`;
}

export function truncateId(id: string, len = 8): string {
  if (!id) return '—';
  return id.slice(-len);
}
