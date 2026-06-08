import type { DbBike, MamDemoDb } from './types';
import { normalizeRegistrationNumber } from '../validation/registrationNumber';

export { normalizeRegistrationNumber };

function bikeStatus(bike: DbBike): string {
  return (bike.status ?? '').trim().toUpperCase();
}

/** True when the bike occupies active inventory (blocks reg/chassis reuse). */
export function isBikeActiveInventory(bike: DbBike): boolean {
  const status = bikeStatus(bike);
  return status === 'IN_STOCK' || status === 'HELD';
}

/** Block only when the same normalized registration exists on IN_STOCK / HELD bikes. */
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
      isBikeActiveInventory(b) &&
      normalizeRegistrationNumber(b.registration_no ?? '') === normalized
  );
}

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
      isBikeActiveInventory(b) &&
      (b.chassis_no ?? '').trim().toLowerCase() === normalized
  );
}

/** Informational: a SOLD bike previously used this registration (any format). */
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
      bikeStatus(b) === 'SOLD' &&
      normalizeRegistrationNumber(b.registration_no ?? '') === normalized
  );
}
