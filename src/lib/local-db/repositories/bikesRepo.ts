import type { Bike } from '../../../types/entities';
import type { PaymentMethod } from '../../../types/loan';
import { roundLKR } from '../../finance/money';
import { generateCode, generateId, getDb, saveDb } from '../localDb';
import { mapBike } from '../mappers';
import type { DbBike, DbDocument, MamDemoDb } from '../types';
import { createCashSaleDocument, createBikePurchaseDocument } from '../../documents/documentService';
import type { DocumentPartySnapshot } from '../../documents/types';
import { buildAuditSummary, uiError } from '../../i18n/messages';
import {
  createCustomer,
  findCustomerByPhoneOrNic,
  getCustomer,
} from './customersRepo';
import {
  isValidSriLankanPhone,
  normalizeSriLankanPhone,
} from '../../validation/phone';

const inFlightBikeCreates = new Set<string>();
const inFlightCashSales = new Set<string>();
const inFlightBikePurchases = new Set<string>();

function normalizeRegistrationNo(registrationNo: string): string {
  return registrationNo.trim().toLowerCase();
}

function normalizeChassisNo(chassisNo: string): string {
  return chassisNo.trim().toLowerCase();
}

/** Inventory statuses that block re-using the same registration or chassis. */
const ACTIVE_BIKE_STATUSES: ReadonlySet<DbBike['status']> = new Set([
  'IN_STOCK',
  'HELD',
]);

function isActiveBikeStatus(status: DbBike['status']): boolean {
  return ACTIVE_BIKE_STATUSES.has(status);
}

/** True when an in-stock / held bike already uses this registration. */
export function isRegistrationUsedByActiveBike(
  db: MamDemoDb,
  registrationNo: string,
  excludeBikeId?: string
): boolean {
  const normalized = normalizeRegistrationNo(registrationNo);
  if (!normalized) return false;
  return db.bikes.some(
    (b) =>
      b.id !== excludeBikeId &&
      isActiveBikeStatus(b.status) &&
      normalizeRegistrationNo(b.registration_no ?? '') === normalized
  );
}

/** @deprecated Use isRegistrationUsedByActiveBike */
export const isRegistrationUsedByNonSoldBike = isRegistrationUsedByActiveBike;

/** True when an in-stock / held bike already uses this chassis number. */
export function isChassisUsedByActiveBike(
  db: MamDemoDb,
  chassisNo: string,
  excludeBikeId?: string
): boolean {
  const normalized = normalizeChassisNo(chassisNo);
  if (!normalized) return false;
  return db.bikes.some(
    (b) =>
      b.id !== excludeBikeId &&
      isActiveBikeStatus(b.status) &&
      normalizeChassisNo(b.chassis_no ?? '') === normalized
  );
}

/** Sold bike records sharing this registration (business history). */
export function hasSoldBikeHistoryForRegistration(
  db: MamDemoDb,
  registrationNo: string,
  excludeBikeId?: string
): boolean {
  const normalized = normalizeRegistrationNo(registrationNo);
  if (!normalized) return false;
  return db.bikes.some(
    (b) =>
      b.id !== excludeBikeId &&
      b.status === 'SOLD' &&
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
  if (isRegistrationUsedByActiveBike(db, registration)) {
    throw new Error(uiError('registrationExists'));
  }

  const chassis = input.chassisNo?.trim() ?? '';
  if (chassis && isChassisUsedByActiveBike(db, chassis)) {
    throw new Error(uiError('chassisExists'));
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
    if (isRegistrationUsedByActiveBike(db, registration, id)) {
      throw new Error(uiError('registrationExists'));
    }
    input.registration_no = registration;
  }

  if (input.chassis_no !== undefined) {
    const chassis = input.chassis_no.trim();
    if (chassis && isChassisUsedByActiveBike(db, chassis, id)) {
      throw new Error(uiError('chassisExists'));
    }
    input.chassis_no = chassis;
  }

  if (row.status === 'SOLD') {
    const locked: (keyof DbBike)[] = [
      'cost_price',
      'selling_price',
      'sold_price',
      'repair_cost',
      'other_cost',
    ];
    for (const key of locked) {
      if (key in input && input[key] !== undefined && input[key] !== row[key]) {
        throw new Error(uiError('bikeSaleFinancialsLocked'));
      }
    }
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
      soldDate,
      sellingPrice: opts.soldPrice,
      discountAmount: 0,
      additionalCharges: 0,
      finalAmount: opts.soldPrice,
      paymentMethod: 'CASH',
      customer: {
        name: 'Walk-in buyer',
        nic: '—',
        phone: '—',
        address: '—',
      },
    });
    saveDb(db);
  }
  return updated;
}

export interface CompleteCashSaleInput {
  sellingPrice: number;
  discountAmount: number;
  additionalCharges: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  soldDate?: string;
  customerId?: string;
  customer?: {
    name: string;
    phone: string;
    nic?: string;
    address?: string;
  };
  clientSubmitId?: string;
}

export interface CompleteCashSaleResult {
  bike: Bike;
  document: DbDocument;
  customerId: string;
}

function partyFromCustomerEntity(
  customer: {
    name: string;
    phone: string;
    nic: string;
    address: string;
    customerCode?: string;
  }
): DocumentPartySnapshot {
  return {
    name: customer.name,
    phone: customer.phone,
    nic: customer.nic || '—',
    address: customer.address || '—',
    customerCode: customer.customerCode,
  };
}

/** Fully settled cash sale — creates customer (or reuses), marks bike sold, locks invoice. */
export function completeCashSale(
  bikeId: string,
  input: CompleteCashSaleInput,
  db: MamDemoDb = getDb()
): CompleteCashSaleResult {
  if (input.clientSubmitId) {
    if (inFlightCashSales.has(input.clientSubmitId)) {
      throw new Error(uiError('cashSaleInProgress'));
    }
    inFlightCashSales.add(input.clientSubmitId);
  }

  try {
    const row = db.bikes.find((b) => b.id === bikeId);
    if (!row || row.status !== 'IN_STOCK') {
      throw new Error(uiError('bikeNotAvailableForSale'));
    }

    const existingInvoice = db.documents?.find(
      (d) => d.bike_id === bikeId && d.document_type === 'CASH_SALE'
    );
    if (existingInvoice) {
      throw new Error(uiError('cashSaleAlreadyExists'));
    }

    const discountAmount = roundLKR(Math.max(0, input.discountAmount));
    const additionalCharges = roundLKR(Math.max(0, input.additionalCharges));
    const sellingPrice = roundLKR(input.sellingPrice);

    if (sellingPrice <= 0) {
      throw new Error(uiError('enterValidSoldPrice'));
    }
    if (discountAmount > sellingPrice) {
      throw new Error(uiError('discountExceedsSellingPrice'));
    }

    const finalAmount = roundLKR(
      sellingPrice - discountAmount + additionalCharges
    );
    if (finalAmount <= 0) {
      throw new Error(uiError('invalidFinalSaleAmount'));
    }

    let resolvedCustomerId = input.customerId;
    let party: DocumentPartySnapshot;

    if (resolvedCustomerId) {
      const existing = getCustomer(resolvedCustomerId, db);
      if (!existing) {
        throw new Error(uiError('customerNotFound'));
      }
      party = partyFromCustomerEntity(existing);
    } else {
      const draft = input.customer;
      if (!draft?.name?.trim() || !draft.phone?.trim()) {
        throw new Error(uiError('cashSaleCustomerRequired'));
      }
      if (!isValidSriLankanPhone(draft.phone)) {
        throw new Error(uiError('invalidSriLankanPhone'));
      }
      const normalizedPhone = normalizeSriLankanPhone(draft.phone);
      const matched = findCustomerByPhoneOrNic(
        db,
        normalizedPhone,
        draft.nic
      );
      if (matched) {
        resolvedCustomerId = matched.id;
        party = partyFromCustomerEntity(matched);
      } else {
        const created = createCustomer(
          {
            full_name: draft.name.trim(),
            phone: normalizedPhone,
            address: draft.address?.trim() ?? '',
            nic: draft.nic?.trim() ?? '',
          },
          db
        );
        resolvedCustomerId = created.id;
        party = partyFromCustomerEntity(created);
      }
    }

    const soldDate =
      input.soldDate ?? new Date().toISOString().split('T')[0];
    const ts = new Date().toISOString();
    const staffId = db.profiles[0]?.id;
    const staffName = db.profiles[0]?.full_name?.trim() || 'Staff';

    row.status = 'SOLD';
    row.sold_date = soldDate;
    row.sold_price = finalAmount;
    row.updated_at = ts;

    const document = createCashSaleDocument(db, bikeId, {
      soldDate,
      sellingPrice,
      discountAmount,
      additionalCharges,
      finalAmount,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
      customer: party,
      customerId: resolvedCustomerId,
      createdBy: staffId,
      soldBy: staffName,
    });

    db.audit_logs.push({
      id: generateId(),
      user_id: staffId ?? 'system',
      action: 'SALE',
      entity_type: 'bike',
      entity_id: bikeId,
      summary: buildAuditSummary('bikeCashSaleAuditSummary', {
        bikeCode: row.bike_code,
        docNumber: document.document_number,
        customer: party.name,
        amount: finalAmount,
        soldBy: staffName,
      }),
      created_at: ts,
    });

    saveDb(db);

    return {
      bike: mapBike(row),
      document,
      customerId: resolvedCustomerId,
    };
  } finally {
    if (input.clientSubmitId) {
      inFlightCashSales.delete(input.clientSubmitId);
    }
  }
}

export interface CompleteBikePurchaseInput {
  model: string;
  registrationNo: string;
  chassisNo?: string;
  engineNo?: string;
  color?: string;
  year?: number;
  purchasePrice: number;
  repairCost?: number;
  transportCost?: number;
  documentCost?: number;
  otherCost?: number;
  sellingPrice: number;
  purchaseDate: string;
  purchaseNotes?: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  paymentNotes?: string;
  customerId?: string;
  customer?: {
    name: string;
    phone: string;
    nic?: string;
    address?: string;
  };
  clientSubmitId?: string;
}

export interface CompleteBikePurchaseResult {
  bike: Bike;
  document: DbDocument;
  sellerCustomerId: string;
}

/** Purchase from seller → receipt → stock entry (single transaction). */
export function completeBikePurchase(
  input: CompleteBikePurchaseInput,
  db: MamDemoDb = getDb()
): CompleteBikePurchaseResult {
  if (input.clientSubmitId) {
    if (inFlightBikePurchases.has(input.clientSubmitId)) {
      throw new Error(uiError('bikePurchaseInProgress'));
    }
    inFlightBikePurchases.add(input.clientSubmitId);
  }

  try {
    if (!input.model.trim()) {
      throw new Error(uiError('bikeFormRequiredFields'));
    }
    if (!input.registrationNo.trim()) {
      throw new Error(uiError('registrationRequired'));
    }

    const purchasePrice = roundLKR(input.purchasePrice);
    const repairCost = roundLKR(input.repairCost ?? 0);
    const transportCost = roundLKR(input.transportCost ?? 0);
    const documentCost = roundLKR(input.documentCost ?? 0);
    const extraOther = roundLKR(input.otherCost ?? 0);
    const sellingPrice = roundLKR(input.sellingPrice);

    if (purchasePrice <= 0 || sellingPrice <= 0) {
      throw new Error(uiError('bikePricesRequired'));
    }

    const registration = input.registrationNo.trim();
    if (isRegistrationUsedByActiveBike(db, registration)) {
      throw new Error(uiError('registrationExists'));
    }

    const chassis = input.chassisNo?.trim() ?? '';
    if (chassis && isChassisUsedByActiveBike(db, chassis)) {
      throw new Error(uiError('chassisExists'));
    }

    let resolvedSellerId = input.customerId;
    let party: DocumentPartySnapshot;

    if (resolvedSellerId) {
      const existing = getCustomer(resolvedSellerId, db);
      if (!existing) {
        throw new Error(uiError('customerNotFound'));
      }
      party = partyFromCustomerEntity(existing);
    } else {
      const draft = input.customer;
      if (!draft?.name?.trim() || !draft.phone?.trim()) {
        throw new Error(uiError('bikePurchaseSellerRequired'));
      }
      if (!isValidSriLankanPhone(draft.phone)) {
        throw new Error(uiError('invalidSriLankanPhone'));
      }
      const normalizedPhone = normalizeSriLankanPhone(draft.phone);
      const matched = findCustomerByPhoneOrNic(db, normalizedPhone, draft.nic);
      if (matched) {
        resolvedSellerId = matched.id;
        party = partyFromCustomerEntity(matched);
      } else {
        const created = createCustomer(
          {
            full_name: draft.name.trim(),
            phone: normalizedPhone,
            address: draft.address?.trim() ?? '',
            nic: draft.nic?.trim() ?? '',
          },
          db
        );
        resolvedSellerId = created.id;
        party = partyFromCustomerEntity(created);
      }
    }

    const ts = new Date().toISOString();
    const staffId = db.profiles[0]?.id;
    const staffName = db.profiles[0]?.full_name?.trim() || 'Staff';
    const otherCostTotal = roundLKR(transportCost + documentCost + extraOther);
    const totalPaidAmount = purchasePrice;

    const row: DbBike = {
      id: generateId(),
      client_submit_id: input.clientSubmitId,
      bike_code: generateCode('BIK', db.counters),
      status: 'IN_STOCK',
      created_at: ts,
      updated_at: ts,
      model: input.model.trim(),
      registration_no: registration,
      chassis_no: chassis,
      engine_no: input.engineNo?.trim() ?? '',
      color: input.color?.trim() ?? '',
      year: input.year ?? 0,
      cost_price: purchasePrice,
      selling_price: sellingPrice,
      repair_cost: repairCost,
      other_cost: otherCostTotal,
      purchase_date: input.purchaseDate,
      purchased_from_customer_id: resolvedSellerId,
      purchase_payment_method: input.paymentMethod,
      purchase_payment_reference: input.paymentReference?.trim() || undefined,
      acquired_by_user_id: staffId,
      acquisition_source: 'PURCHASE',
    };

    db.bikes.push(row);

    const document = createBikePurchaseDocument(db, row.id, {
      purchaseDate: input.purchaseDate,
      seller: party,
      sellerCustomerId: resolvedSellerId,
      purchasePrice,
      repairCost,
      transportCost,
      documentCost,
      otherCost: extraOther,
      totalPaidAmount,
      expectedSellingPrice: sellingPrice,
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference,
      paymentNotes: input.paymentNotes,
      purchaseNotes: input.purchaseNotes,
      handledBy: staffName,
      createdBy: staffId,
    });

    row.purchase_receipt_id = document.id;
    row.updated_at = ts;

    db.audit_logs.push({
      id: generateId(),
      user_id: staffId ?? 'system',
      action: 'CREATE',
      entity_type: 'bike',
      entity_id: row.id,
      summary: buildAuditSummary('bikePurchaseAuditSummary', {
        bikeCode: row.bike_code,
        docNumber: document.document_number,
        seller: party.name,
        amount: totalPaidAmount,
        handledBy: staffName,
      }),
      created_at: ts,
    });

    saveDb(db);

    return {
      bike: mapBike(row),
      document,
      sellerCustomerId: resolvedSellerId,
    };
  } finally {
    if (input.clientSubmitId) {
      inFlightBikePurchases.delete(input.clientSubmitId);
    }
  }
}
