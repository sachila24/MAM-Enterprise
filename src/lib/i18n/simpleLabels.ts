import { getNaturalSinhala } from './sinhalaNaturalizer';
import { app as appEn, type AppLabelKey } from './locales/en';
import { app as appSi } from './locales/si';

/** Bilingual UI labels: English first, Sinhala in brackets. */

export type DisplayMode = 'both' | 'en' | 'si';

function bi(en: string, si: string): string {
  return `${en} (${si})`;
}

export type LabelKey = AppLabelKey;

function buildAppCatalog(): { readonly [K in LabelKey]: string } {
  const keys = Object.keys(appEn) as LabelKey[];
  return Object.fromEntries(
    keys.map((key) => [key, bi(appEn[key], appSi[key])])
  ) as { readonly [K in LabelKey]: string };
}

/** Bilingual catalog keyed for `getLabel` / `t()` — built from `locales/en` + `locales/si`. */
export const t = buildAppCatalog();

function parseBilingualLabel(text: string): { en: string; si: string } | null {
  if (!text.endsWith(')')) return null;

  let depth = 0;
  for (let i = text.length - 1; i >= 0; i--) {
    const char = text[i];
    if (char === ')') depth++;
    if (char === '(') {
      depth--;
      if (depth === 0) {
        const en = text.slice(0, i).trim();
        const si = text.slice(i + 1, -1).trim();
        if (!en || !si) return null;
        return { en, si };
      }
    }
  }

  return null;
}

/** Resolve a bilingual string for the current display mode. */
export function resolveLabel(text: string, mode: DisplayMode): string {
  const parsed = parseBilingualLabel(text);
  if (!parsed) return text;

  const naturalSinhala = getNaturalSinhala(parsed.si);
  if (mode === 'both') return bi(parsed.en, naturalSinhala);
  if (mode === 'en') return parsed.en;
  return naturalSinhala;
}

export function getLabel(key: LabelKey, mode: DisplayMode = 'both'): string {
  const parsed = parseBilingualLabel(t[key]);
  if (!parsed) return t[key];

  const naturalSinhala = getNaturalSinhala(key, parsed.si);
  if (mode === 'both') return bi(parsed.en, naturalSinhala);
  if (mode === 'en') return parsed.en;
  return naturalSinhala;
}

/** Map internal allocation row type (English) to bilingual display label. */
const ALLOCATION_TYPE_KEYS: Record<string, LabelKey> = {
  Interest: 'allocInterest',
  Principal: 'allocPrincipal',
  'Late fee': 'allocLateFee',
  Installment: 'allocInstallment',
  Advance: 'allocAdvance',
};

export function displayAllocationType(
  internalType: string,
  mode: DisplayMode = 'both'
): string {
  const key = ALLOCATION_TYPE_KEYS[internalType];
  return key ? getLabel(key, mode) : internalType;
}

const BADGE_KEYS: Record<string, LabelKey> = {
  Paid: 'allocPaid',
  Partial: 'allocPartial',
  Remaining: 'allocRemaining',
};

export function displayAllocationBadge(
  badge: string,
  mode: DisplayMode = 'both'
): string {
  const key = BADGE_KEYS[badge];
  return key ? getLabel(key, mode) : badge;
}

/** Map formatEnum keys to label keys for status display. */
export const ENUM_LABEL_KEYS: Record<string, LabelKey> = {
  VEHICLE_BOOK: 'vehicleBook',
  MONTHLY: 'monthlyInstallment',
  CASH: 'statusCash',
  SOLD: 'statusSold',
  IN_STOCK: 'statusInStock',
  CONFIRMED: 'statusConfirmed',
  ACTIVE: 'statusActive',
  active: 'statusActive',
  OVERDUE: 'statusOverdue',
  overdue: 'statusOverdue',
  COMPLETED: 'statusCompleted',
  completed: 'statusCompleted',
  VOIDED: 'statusVoided',
  HELD: 'statusHeld',
  RESERVED: 'statusReserved',
  RELEASED: 'statusReturned',
  returned: 'guaranteeStatusReleased',
  held: 'guaranteeStatusHeld',
  PAID: 'statusPaid',
  PENDING: 'statusPending',
  CANCELLED: 'statusCancelled',
  CASH_LOAN: 'typeCashLoan',
  BIKE_INSTALLMENT: 'typeBikeInstallment',
  INTEREST_ONLY_REDUCING_PRINCIPAL: 'monthlyInterestReducing',
  FIXED_TERM_INSTALLMENT: 'fixedTermInstallment',
  BIKE: 'addBike',
  SETTLED: 'statusCompleted',
  CHEQUE: 'statusCheque',
  BANK_TRANSFER: 'statusBankTransfer',
  OTHER: 'statusOther',
  RENT: 'expenseRent',
  UTILITIES: 'expenseUtilities',
  SALARIES: 'expenseSalaries',
  MAINTENANCE: 'expenseMaintenance',
  FUEL: 'expenseFuel',
  SUPPLIES: 'expenseSupplies',
  MARKETING: 'expenseMarketing',
  None: 'categoryNone',
  MANAGER: 'roleManagerApprove',
  STAFF: 'roleStaffStandard',
  inactive: 'statusInactive',
  Auto: 'backupTypeAuto',
  Manual: 'backupTypeManual',
  LOAN_REPAYMENT: 'incomeLoanRepayment',
  LOAN_ADVANCE_PAYMENT: 'incomeLoanAdvance',
  SERVICE_FEE_INCOME: 'incomeServiceFee',
  REGISTRATION_FEE_INCOME: 'incomeRegistrationFee',
};
