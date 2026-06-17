import type { DbBike, MamDemoDb } from './types';
import { normalizeRegistrationNumber } from '../validation/registrationNumber';

export { normalizeRegistrationNumber };

/** Statuses that occupy active inventory and block reg/chassis reuse. */
const ACTIVE_INVENTORY_STATUSES = new Set([
  'IN_STOCK',
  'AVAILABLE',
  'HELD',
  'RESERVED',
]);

/** Statuses that release registration for a new inventory row. */
const INACTIVE_INVENTORY_STATUSES = new Set([
  'SOLD',
  'SETTLED',
  'RETURNED',
  'ARCHIVED',
  'INACTIVE',
]);

function bikeStatus(bike: DbBike): string {
  return (bike.status ?? '').trim().toUpperCase();
}

function hasCashSaleDocument(db: MamDemoDb, bikeId: string): boolean {
  return (
    db.documents?.some(
      (d) => d.bike_id === bikeId && d.document_type === 'CASH_SALE'
    ) ?? false
  );
}

/**
 * A bike that was sold or otherwise left active stock — even when `status`
 * was not updated correctly in older data (`sold_loan_id` / `sold_date` present).
 */
export function isBikeEffectivelyInactive(bike: DbBike, db?: MamDemoDb): boolean {
  const status = bikeStatus(bike);
  if (INACTIVE_INVENTORY_STATUSES.has(status)) return true;
  if (bike.sold_loan_id?.trim()) return true;
  if (bike.sold_date?.trim()) return true;
  if (status === 'SOLD') return true;
  if (db && hasCashSaleDocument(db, bike.id)) return true;
  return false;
}

/** True when the bike occupies active inventory (blocks reg/chassis reuse). */
export function isBikeActiveInventory(bike: DbBike, db?: MamDemoDb): boolean {
  if (isBikeEffectivelyInactive(bike, db)) return false;
  const status = bikeStatus(bike);
  return ACTIVE_INVENTORY_STATUSES.has(status);
}

/** Search/filter helper — NOT used to block create or purchase. */
export function isRegistrationUsedByActiveBike(
  db: MamDemoDb,
  registrationNo: string,
  excludeBikeId?: string
): boolean {
  const normalized = normalizeRegistrationNumber(registrationNo);
  if (!normalized) return false;
  return db.bikes.some(
    (b) =>
      b.id !== excludeBikeId &&
      isBikeActiveInventory(b, db) &&
      normalizeRegistrationNumber(b.registration_no ?? '') === normalized
  );
}

/** Search/filter helper — NOT used to block create or purchase. */
export function isChassisUsedByActiveBike(
  db: MamDemoDb,
  chassisNo: string,
  excludeBikeId?: string
): boolean {
  const normalized = chassisNo.trim().toLowerCase();
  if (!normalized) return false;
  return db.bikes.some(
    (b) =>
      b.id !== excludeBikeId &&
      isBikeActiveInventory(b, db) &&
      (b.chassis_no ?? '').trim().toLowerCase() === normalized
  );
}

/**
 * Non-blocking UI hint: any prior bike row used this registration or chassis.
 * Normalization is for matching only — never prevents save.
 */
export function hasPriorRegistrationOrChassisUsage(
  db: MamDemoDb,
  registrationNo: string,
  chassisNo?: string,
  excludeBikeId?: string
): boolean {
  const regNorm = registrationNo.trim()
    ? normalizeRegistrationNumber(registrationNo)
    : '';
  const chassisNorm = chassisNo?.trim().toLowerCase() ?? '';
  if (!regNorm && !chassisNorm) return false;

  return db.bikes.some((b) => {
    if (b.id === excludeBikeId) return false;
    if (
      regNorm &&
      normalizeRegistrationNumber(b.registration_no ?? '') === regNorm
    ) {
      return true;
    }
    if (
      chassisNorm &&
      (b.chassis_no ?? '').trim().toLowerCase() === chassisNorm
    ) {
      return true;
    }
    return false;
  });
}

/** @deprecated Use hasPriorRegistrationOrChassisUsage for UI hints */
export function hasSoldBikeHistoryForRegistration(
  db: MamDemoDb,
  registrationNo: string,
  excludeBikeId?: string
): boolean {
  const normalized = normalizeRegistrationNumber(registrationNo);
  if (!normalized) return false;
  return db.bikes.some(
    (b) =>
      b.id !== excludeBikeId &&
      isBikeEffectivelyInactive(b, db) &&
      normalizeRegistrationNumber(b.registration_no ?? '') === normalized
  );
}

/**
 * Repair inventory status on load — does not change ids, registration, or loan links.
 * Fixes legacy rows that were sold but still marked IN_STOCK / HELD.
 */
export function repairBikeInventoryStatuses(db: MamDemoDb): boolean {
  let changed = false;
  const ts = new Date().toISOString();

  for (const bike of db.bikes) {
    const status = bikeStatus(bike);
    const linkedLoan = db.loans.find((l) => l.bike_id === bike.id);
    const soldViaLoan =
      Boolean(bike.sold_loan_id?.trim()) ||
      (linkedLoan?.loan_purpose === 'BIKE_INSTALLMENT' &&
        !['CANCELLED'].includes(linkedLoan.status));
    const soldViaCash = hasCashSaleDocument(db, bike.id);
    const hasSaleMarkers =
      soldViaLoan || soldViaCash || Boolean(bike.sold_date?.trim());

    if (
      hasSaleMarkers &&
      ACTIVE_INVENTORY_STATUSES.has(status) &&
      !INACTIVE_INVENTORY_STATUSES.has(status)
    ) {
      bike.status = 'SOLD';
      if (!bike.sold_loan_id && linkedLoan) {
        bike.sold_loan_id = linkedLoan.id;
      }
      bike.updated_at = ts;
      changed = true;
    }
  }

  return changed;
}
