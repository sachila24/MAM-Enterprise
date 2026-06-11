import { getDb, saveDb } from '../localDb';
import { normalizeBusinessSettings } from '../businessSettings';
import type {
  BusinessCurrency,
  BusinessLanguage,
  DbBusinessSettings,
  MamDemoDb,
} from '../types';

export {
  createDefaultBusinessSettings,
  isValidBusinessSettings,
  normalizeBusinessSettings,
} from '../businessSettings';

export interface BusinessSettingsForm {
  businessName: string;
  regNumber: string;
  address: string;
  phone: string;
  currency: BusinessCurrency;
  language: BusinessLanguage;
  receiptFooter: string;
}

function toForm(settings: DbBusinessSettings): BusinessSettingsForm {
  return {
    businessName: settings.business_name,
    regNumber: settings.registration_number,
    address: settings.address,
    phone: settings.contact_phone,
    currency: settings.default_currency,
    language: settings.default_language,
    receiptFooter: settings.receipt_footer_note,
  };
}

function toDb(
  input: BusinessSettingsForm,
  existing: DbBusinessSettings
): DbBusinessSettings {
  return {
    business_name: input.businessName.trim(),
    registration_number: input.regNumber.trim(),
    address: input.address.trim(),
    contact_phone: input.phone.trim(),
    default_currency: input.currency,
    default_language: input.language,
    receipt_footer_note: input.receiptFooter.trim(),
    // Preserve legacy staff flag for backup compatibility.
    staff_activity_log_access: existing.staff_activity_log_access,
    updated_at: new Date().toISOString(),
  };
}

export function getBusinessSettingsForm(
  db: MamDemoDb = getDb()
): BusinessSettingsForm {
  normalizeBusinessSettings(db);
  return toForm(db.business_settings);
}

export function saveBusinessSettings(
  input: BusinessSettingsForm,
  db: MamDemoDb = getDb()
): BusinessSettingsForm {
  normalizeBusinessSettings(db);
  db.business_settings = toDb(input, db.business_settings);
  saveDb(db);
  return getBusinessSettingsForm(db);
}
