/**
 * LOCAL DEMO MODE — browser localStorage only. Not production.
 * Replace with Supabase repositories later.
 */

import type { MamDemoDb } from './types';
import { buildSeedDatabase } from './seedDemoData';
import { roundLKR } from '../finance/money';
import {
  isValidBusinessSettings,
  normalizeBusinessSettings,
} from './businessSettings';
import { DEFAULT_APP_AUTH, isValidAppAuth, normalizeAppAuth } from './appAuth';

export const STORAGE_KEY = 'mam_demo_db_v1';

/** @deprecated Use subscribe() from this module; kept for compatibility. */
export const DEMO_DB_EVENT = 'mam-demo-db-changed';

const listeners = new Set<() => void>();

let cachedDb: MamDemoDb | null = null;
/** Sentinel so first client read always parses. */
let cachedRaw = '\0';

const SSR_SNAPSHOT: MamDemoDb = {
  version: 1,
  profiles: [],
  customers: [],
  bikes: [],
  loans: [],
  loan_installments: [],
  loan_interest_cycles: [],
  loan_payments: [],
  payment_allocations: [],
  early_settlements: [],
  guarantees: [],
  receipts: [],
  documents: [],
  expenses: [],
  cash_transactions: [],
  audit_logs: [],
  business_settings: {
    business_name: 'M A M Trading',
    registration_number: '',
    address: 'No.47, Galmaduwa, Mahailuppallama',
    contact_phone: '071 593 1681',
    default_currency: 'LKR',
    default_language: 'EN',
    receipt_footer_note: '',
    staff_activity_log_access: true,
    updated_at: '1970-01-01T00:00:00.000Z',
  },
  app_auth: DEFAULT_APP_AUTH,
  counters: {},
};

function readRaw(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY) ?? '';
}

function isValidDb(value: unknown): value is MamDemoDb {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as MamDemoDb).version === 1 &&
    Array.isArray((value as MamDemoDb).customers)
  );
}

function seedAndPersist(): MamDemoDb {
  const db = buildSeedDatabase();
  normalizeDemoPayments(db);
  normalizeDemoGuarantees(db);
  normalizeDemoDocuments(db);
  normalizeDemoBikes(db);
  normalizeDemoLoans(db);
  normalizeBusinessSettings(db);
  normalizeAppAuth(db);
  cachedDb = db;
  cachedRaw = JSON.stringify(db);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, cachedRaw);
  }
  return db;
}

function parseStoredDb(raw: string): MamDemoDb {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidDb(parsed)) {
      throw new Error('Invalid demo DB shape');
    }
    return parsed;
  } catch {
    console.warn('[mam demo] Corrupted localStorage — re-seeding demo data');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    return seedAndPersist();
  }
}

function normalizeDemoPayments(db: MamDemoDb) {
  for (const p of db.loan_payments) {
    if (typeof p.discount_amount !== 'number') p.discount_amount = 0;
    if (typeof p.applied_amount !== 'number') {
      p.applied_amount = roundLKR(p.amount + p.discount_amount);
    }
  }
}

function normalizeDemoGuarantees(db: MamDemoDb) {
  for (const g of db.guarantees) {
    if (!g.customer_id) {
      const loan = db.loans.find((l) => l.id === g.loan_id);
      if (loan) g.customer_id = loan.customer_id;
    }
  }
}

function normalizeDemoDocuments(db: MamDemoDb) {
  if (!Array.isArray(db.documents)) {
    db.documents = [];
  }
}

function normalizeDemoBikes(db: MamDemoDb) {
  for (const b of db.bikes) {
    if (typeof b.repair_cost !== 'number') b.repair_cost = 0;
    if (typeof b.other_cost !== 'number') b.other_cost = 0;
  }
}

function normalizeDemoLoans(db: MamDemoDb) {
  if (!Array.isArray(db.cash_transactions)) {
    db.cash_transactions = [];
  }
  for (const loan of db.loans) {
    if (typeof loan.service_fee !== 'number') loan.service_fee = 0;
    if (typeof loan.registration_fee !== 'number') loan.registration_fee = 0;
    if (typeof loan.customer_paid_amount !== 'number') {
      loan.customer_paid_amount = 0;
    }
    if (typeof loan.advance_payment !== 'number') loan.advance_payment = 0;
  }
}

/** Stable snapshot for useSyncExternalStore — same reference until storage changes. */
export function getDbSnapshot(): MamDemoDb {
  if (typeof window === 'undefined') {
    return SSR_SNAPSHOT;
  }

  const raw = readRaw();
  if (raw === cachedRaw && cachedDb) {
    return cachedDb;
  }

  if (!raw) {
    return seedAndPersist();
  }

  cachedDb = parseStoredDb(raw);
  normalizeDemoPayments(cachedDb);
  normalizeDemoGuarantees(cachedDb);
  normalizeDemoDocuments(cachedDb);
  normalizeDemoBikes(cachedDb);
  normalizeDemoLoans(cachedDb);
  normalizeBusinessSettings(cachedDb);
  normalizeAppAuth(cachedDb);
  cachedRaw = raw;
  return cachedDb;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateCode(
  prefix: string,
  counters: Record<string, number>
): string {
  const next = (counters[prefix] ?? 0) + 1;
  counters[prefix] = next;
  return `${prefix}-${String(next).padStart(5, '0')}`;
}

/** Read current DB (cached). Prefer useDemoDb() in React components. */
export function getDb(): MamDemoDb {
  return getDbSnapshot();
}

export function saveDb(db: MamDemoDb): void {
  if (typeof window === 'undefined') return;
  cachedDb = db;
  cachedRaw = JSON.stringify(db);
  localStorage.setItem(STORAGE_KEY, cachedRaw);
  notifyListeners();
}

/**
 * Ensure seeded demo snapshots don't contain referentially orphaned rows.
 *
 * Seed data is built in `seedDemoData.ts`. If it ever includes partial tables
 * (e.g. `loan_installments` referencing loan IDs missing from `loans`),
 * we strip dependent rows so the app doesn't reference non-existent records
 * after "Reset demo data".
 */
function removeOrphanedDemoRecords(db: MamDemoDb): void {
  const validProfileIds = new Set(db.profiles.map((p) => p.id));
  const validCustomerIds = new Set(db.customers.map((c) => c.id));
  const validBikeIds = new Set(db.bikes.map((b) => b.id));
  const validLoanIds = new Set(db.loans.map((l) => l.id));

  // Loans-first so dependent tables can validate against the final loan set.
  db.loan_interest_cycles = db.loan_interest_cycles.filter((c) =>
    validLoanIds.has(c.loan_id)
  );
  db.loan_installments = db.loan_installments.filter((i) =>
    validLoanIds.has(i.loan_id)
  );
  db.loan_payments = db.loan_payments.filter(
    (p) => validLoanIds.has(p.loan_id) && validCustomerIds.has(p.customer_id)
  );
  db.early_settlements = db.early_settlements.filter(
    (s) => validLoanIds.has(s.loan_id) && validCustomerIds.has(s.customer_id)
  );
  db.guarantees = db.guarantees.filter(
    (g) => validLoanIds.has(g.loan_id) && validCustomerIds.has(g.customer_id)
  );
  if (db.cash_transactions) {
    db.cash_transactions = db.cash_transactions.filter(
      (t) =>
        validLoanIds.has(t.loan_id) && validCustomerIds.has(t.customer_id)
    );
  }

  // Recompute IDs after filtering.
  const validInstallmentIds = new Set(db.loan_installments.map((i) => i.id));
  const validInterestCycleIds = new Set(
    db.loan_interest_cycles.map((c) => c.id)
  );
  const validPaymentIds = new Set(db.loan_payments.map((p) => p.id));

  db.payment_allocations = db.payment_allocations.filter((a) => {
    if (!validPaymentIds.has(a.payment_id)) return false;
    if (!validLoanIds.has(a.loan_id)) return false;
    if (a.installment_id && !validInstallmentIds.has(a.installment_id)) {
      return false;
    }
    if (
      a.interest_cycle_id &&
      !validInterestCycleIds.has(a.interest_cycle_id)
    ) {
      return false;
    }
    return true;
  });

  db.receipts = db.receipts.filter(
    (r) =>
      validPaymentIds.has(r.payment_id) &&
      validLoanIds.has(r.loan_id) &&
      validCustomerIds.has(r.customer_id)
  );

  db.documents = db.documents.filter((d) => {
    // Only enforce referential integrity for fields that are present.
    if (d.loan_id && !validLoanIds.has(d.loan_id)) return false;
    if (d.payment_id && !validPaymentIds.has(d.payment_id)) return false;
    if (d.customer_id && !validCustomerIds.has(d.customer_id)) return false;
    if (d.bike_id && !validBikeIds.has(d.bike_id)) return false;
    return true;
  });

  // Audit logs reference the user profile that performed the action.
  db.audit_logs = db.audit_logs.filter((log) =>
    validProfileIds.has(log.user_id)
  );
}

const REQUIRED_DB_ARRAY_KEYS: Array<keyof MamDemoDb> = [
  'profiles',
  'customers',
  'bikes',
  'loans',
  'loan_installments',
  'loan_interest_cycles',
  'loan_payments',
  'payment_allocations',
  'early_settlements',
  'guarantees',
  'receipts',
  'documents',
  'expenses',
  'audit_logs',
];

/**
 * Parse and validate a backup JSON blob exported by this app.
 * Throws a descriptive Error when validation fails.
 */
export function parseBackupJson(raw: string): MamDemoDb {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON file.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid backup format.');
  }

  const candidate = parsed as Record<string, unknown>;

  if (!('version' in candidate)) {
    throw new Error('Backup version is missing.');
  }
  if (candidate.version !== 1) {
    throw new Error('Unsupported backup version.');
  }

  for (const key of REQUIRED_DB_ARRAY_KEYS) {
    if (!Array.isArray(candidate[key])) {
      throw new Error(`Backup is missing required table: ${key}.`);
    }
  }

  if (
    typeof candidate.counters !== 'object' ||
    candidate.counters === null ||
    Array.isArray(candidate.counters)
  ) {
    throw new Error('Backup is missing required table: counters.');
  }

  if (
    candidate.business_settings !== undefined &&
    !isValidBusinessSettings(candidate.business_settings)
  ) {
    throw new Error('Backup has invalid business settings.');
  }

  if (candidate.app_auth !== undefined && !isValidAppAuth(candidate.app_auth)) {
    throw new Error('Backup has invalid app password data.');
  }

  const db = candidate as MamDemoDb;
  normalizeBusinessSettings(db);
  normalizeAppAuth(db);
  return db;
}

/** Replace the entire local demo DB from a validated backup JSON payload. */
export function restoreDemoDbFromBackup(raw: string): MamDemoDb {
  if (typeof window === 'undefined') {
    throw new Error('Backup restore is only available in the browser.');
  }
  const db = parseBackupJson(raw);
  saveDb(db);
  return db;
}

export function seedDemoDb(): MamDemoDb {
  const db = buildSeedDatabase();
  saveDb(db);
  return db;
}

export function resetDemoDb(): MamDemoDb {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  cachedRaw = '';
  cachedDb = null;
  const db = seedDemoDb();
  removeOrphanedDemoRecords(db);
  // Persist the cleaned snapshot so the page reload sees consistent state.
  saveDb(db);
  return db;
}

/** Call once before React render — seeds if missing and warms snapshot cache. */
export function initLocalDemoDb(): MamDemoDb {
  if (typeof window === 'undefined') {
    return SSR_SNAPSHOT;
  }
  return getDbSnapshot();
}

export function isDemoMode(): boolean {
  return typeof window !== 'undefined' && !!localStorage.getItem(STORAGE_KEY);
}
