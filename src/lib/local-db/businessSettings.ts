import type { DbBusinessSettings, MamDemoDb } from './types';

export function createDefaultBusinessSettings(): DbBusinessSettings {
  const ts = new Date().toISOString();
  return {
    business_name: 'M A M Trading',
    registration_number: '',
    address: 'No.47, Galmaduwa, Mahailuppallama',
    contact_phone: '071 593 1681',
    default_currency: 'LKR',
    default_language: 'EN',
    receipt_footer_note: '',
    staff_activity_log_access: true,
    updated_at: ts,
  };
}

export function isValidBusinessSettings(
  value: unknown
): value is DbBusinessSettings {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.business_name === 'string' &&
    typeof s.registration_number === 'string' &&
    typeof s.address === 'string' &&
    typeof s.contact_phone === 'string' &&
    (s.default_currency === 'LKR' || s.default_currency === 'USD') &&
    (s.default_language === 'EN' ||
      s.default_language === 'SI' ||
      s.default_language === 'TA') &&
    typeof s.receipt_footer_note === 'string' &&
    typeof s.staff_activity_log_access === 'boolean' &&
    typeof s.updated_at === 'string'
  );
}

/** Ensure `business_settings` exists and has valid shape (legacy DB / backup support). */
export function normalizeBusinessSettings(db: MamDemoDb): void {
  if (!isValidBusinessSettings(db.business_settings)) {
    db.business_settings = createDefaultBusinessSettings();
  }
}
