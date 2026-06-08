/** Local mobile: 0712345678 (10 digits, leading 0). */
const SL_MOBILE_LOCAL = /^0[1-9]\d{8}$/;

/** International: +94712345678 (+94 + 9 digits, no leading 0). */
const SL_MOBILE_INTL = /^\+94[1-9]\d{8}$/;

export function isValidSriLankanPhone(phone: string): boolean {
  const trimmed = phone.trim();
  if (!trimmed) return false;
  return SL_MOBILE_LOCAL.test(trimmed) || SL_MOBILE_INTL.test(trimmed);
}

/** Normalize to local 0XXXXXXXXX for storage/compare. */
export function normalizeSriLankanPhone(phone: string): string {
  const trimmed = phone.trim();
  if (SL_MOBILE_INTL.test(trimmed)) {
    return `0${trimmed.slice(3)}`;
  }
  return trimmed;
}
