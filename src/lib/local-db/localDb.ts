/**
 * LOCAL DEMO MODE — browser localStorage only. Not production.
 * Replace with Supabase repositories later.
 */

import type { MamDemoDb } from './types';
import { buildSeedDatabase } from './seedDemoData';
import { roundLKR } from '../finance/money';

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
  expenses: [],
  audit_logs: [],
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
  normalizeDemoBikes(db);
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

function normalizeDemoBikes(db: MamDemoDb) {
  for (const b of db.bikes) {
    if (typeof b.repair_cost !== 'number') b.repair_cost = 0;
    if (typeof b.other_cost !== 'number') b.other_cost = 0;
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
  normalizeDemoBikes(cachedDb);
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
  return seedDemoDb();
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
