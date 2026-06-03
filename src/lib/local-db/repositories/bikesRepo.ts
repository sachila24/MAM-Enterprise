import type { Bike } from '../../../types/entities';
import { roundLKR } from '../../finance/money';
import { generateCode, generateId, getDb, saveDb } from '../localDb';
import { mapBike } from '../mappers';
import type { DbBike, MamDemoDb } from '../types';
import { createCashSaleDocument } from '../../documents/documentService';
import { uiError } from '../../i18n/messages';

const inFlightBikeCreates = new Set<string>();

function normalizeRegistrationNo(registrationNo: string): string {
  return registrationNo.trim().toLowerCase();
}

/** True when a non-SOLD bike already uses this registration (IN_STOCK / HELD). */
export function isRegistrationUsedByNonSoldBike(
  db: MamDemoDb,
  registrationNo: string,
  excludeBikeId?: string
): boolean {
  const normalized = normalizeRegistrationNo(registrationNo);
  if (!normalized) return false;
  return db.bikes.some(
    (b) =>
      b.id !== excludeBikeId &&
      b.status !== 'SOLD' &&
      normalizeRegistrationNo(b.registration_no ?? '') === normalized
  );
}

export function listBikes(db: MamDemoDb = getDb()): Bike[] {
  return db.bikes.map(mapBike);
}

export function getBike(id: string, db: MamDemoDb = getDb()): Bike | undefined {
  const row = db.bikes.find((b) => b.id === id);
  return row ? mapBike(row) : undefined;
}

export function listInStockBikes(db: MamDemoDb = getDb()): Bike[] {
  return db.bikes.filter((b) => b.status === 'IN_STOCK').map(mapBike);
}

export function bikeProfit(bike: Bike): number {
  const sold = bike.soldPrice ?? bike.sellingPrice;
  return roundLKR(
    sold - bike.costPrice - (bike.repairCost ?? 0) - (bike.otherCost ?? 0)
  );
}

export interface CreateBikeInput {
  model: string;
  registrationNo: string;
  chassisNo?: string;
  engineNo?: string;
  color?: string;
  year?: number;
  costPrice: number;
  sellingPrice: number;
  repairCost?: number;
  otherCost?: number;
  purchaseDate: string;
  clientSubmitId?: string;
}

export function createBike(
  input: CreateBikeInput,
  db: MamDemoDb = getDb()
): Bike {
  if (input.clientSubmitId) {
    const existing = db.bikes.find(
      (b) => b.client_submit_id === input.clientSubmitId
    );
    if (existing) return mapBike(existing);
    if (inFlightBikeCreates.has(input.clientSubmitId)) {
      throw new Error(uiError('bikeSaveInProgress'));
    }
    inFlightBikeCreates.add(input.clientSubmitId);
  }

  if (!input.model.trim()) {
    throw new Error(uiError('bikeFormRequiredFields'));
  }
  if (!input.registrationNo.trim()) {
    throw new Error(uiError('registrationRequired'));
  }
  if (input.costPrice <= 0 || input.sellingPrice <= 0) {
    throw new Error(uiError('bikePricesRequired'));
  }

  const registration = input.registrationNo.trim();
  if (isRegistrationUsedByNonSoldBike(db, registration)) {
    throw new Error(uiError('registrationExists'));
  }

  const chassis = input.chassisNo?.trim() ?? '';
  if (chassis) {
    const duplicateChassis = db.bikes.some(
      (b) => b.chassis_no.trim().toLowerCase() === chassis.toLowerCase()
    );
    if (duplicateChassis) {
      throw new Error(uiError('chassisExists'));
    }
  }

  try {
    const ts = new Date().toISOString();
    const row: DbBike = {
      id: generateId(),
      client_submit_id: input.clientSubmitId,
      bike_code: generateCode('BIK', db.counters),
      status: 'IN_STOCK',
      created_at: ts,
      updated_at: ts,
      model: input.model.trim(),
      registration_no: input.registrationNo.trim(),
      chassis_no: chassis,
      engine_no: input.engineNo?.trim() ?? '',
      color: input.color?.trim() ?? '',
      year: input.year ?? 0,
      cost_price: input.costPrice,
      selling_price: input.sellingPrice,
      repair_cost: input.repairCost ?? 0,
      other_cost: input.otherCost ?? 0,
      purchase_date: input.purchaseDate,
    };
    db.bikes.push(row);
    saveDb(db);
    return mapBike(row);
  } finally {
    if (input.clientSubmitId) {
      inFlightBikeCreates.delete(input.clientSubmitId);
    }
  }
}

export function updateBike(
  id: string,
  input: Partial<DbBike>,
  db: MamDemoDb = getDb()
): Bike | undefined {
  const row = db.bikes.find((b) => b.id === id);
  if (!row) return undefined;

  if (input.registration_no !== undefined) {
    const registration = input.registration_no.trim();
    if (!registration) {
      throw new Error(uiError('registrationRequired'));
    }
    if (isRegistrationUsedByNonSoldBike(db, registration, id)) {
      throw new Error(uiError('registrationExists'));
    }
    input.registration_no = registration;
  }

  Object.assign(row, input, { updated_at: new Date().toISOString() });
  saveDb(db);
  return mapBike(row);
}

export interface MarkBikeSoldInput {
  soldPrice: number;
  soldDate?: string;
  repairCost?: number;
  otherCost?: number;
  loanId?: string;
}

export function markBikeSold(
  bikeId: string,
  input: MarkBikeSoldInput | string | undefined,
  db: MamDemoDb = getDb()
): Bike | undefined {
  const row = db.bikes.find((b) => b.id === bikeId);
  if (!row || row.status !== 'IN_STOCK') return undefined;

  const opts: MarkBikeSoldInput =
    typeof input === 'string'
      ? { soldPrice: row.selling_price, loanId: input }
      : input ?? { soldPrice: row.selling_price };

  const soldDate =
    opts.soldDate ?? new Date().toISOString().split('T')[0];
  const patch: Partial<DbBike> = {
    status: 'SOLD',
    sold_date: soldDate,
    sold_price: opts.soldPrice,
    repair_cost: opts.repairCost ?? row.repair_cost ?? 0,
    other_cost: opts.otherCost ?? row.other_cost ?? 0,
    sold_loan_id: opts.loanId,
  };
  const updated = updateBike(bikeId, patch, db);
  if (updated && !opts.loanId) {
    createCashSaleDocument(db, bikeId, {
      soldPrice: opts.soldPrice,
      soldDate,
      repairCost: opts.repairCost ?? row.repair_cost ?? 0,
      otherCost: opts.otherCost ?? row.other_cost ?? 0,
    });
    saveDb(db);
  }
  return updated;
}
