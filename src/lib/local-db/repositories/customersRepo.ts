import type { Customer } from '../../../types/entities';
import { generateCode, generateId, getDb, saveDb } from '../localDb';
import { mapCustomer } from '../mappers';
import type { DbCustomer, MamDemoDb } from '../types';
import { buildAuditSummary } from '../../i18n/messages';

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Match existing customer by NIC (exact) or phone (digits only) to avoid duplicates. */
export function findCustomerByPhoneOrNic(
  db: MamDemoDb = getDb(),
  phone: string,
  nic?: string
): Customer | undefined {
  const phoneNorm = normalizePhone(phone);
  const nicNorm = nic?.trim().toLowerCase() ?? '';
  const row = db.customers.find((c) => {
    if (nicNorm && c.nic.trim().toLowerCase() === nicNorm) return true;
    if (phoneNorm && normalizePhone(c.phone) === phoneNorm) return true;
    return false;
  });
  return row ? mapCustomer(row, db) : undefined;
}

export function listCustomers(db: MamDemoDb = getDb()): Customer[] {
  return db.customers.map((c) => mapCustomer(c, db));
}

export function getCustomer(
  id: string,
  db: MamDemoDb = getDb()
): Customer | undefined {
  const row = db.customers.find((c) => c.id === id);
  return row ? mapCustomer(row, db) : undefined;
}

export function createCustomer(
  input: Pick<DbCustomer, 'full_name' | 'phone' | 'address' | 'nic'>,
  db: MamDemoDb = getDb()
): Customer {
  const ts = new Date().toISOString();
  const row: DbCustomer = {
    id: generateId(),
    customer_code: generateCode('CUS', db.counters),
    full_name: input.full_name,
    phone: input.phone,
    address: input.address,
    nic: input.nic,
    status: 'ACTIVE',
    created_at: ts,
    updated_at: ts,
  };
  db.customers.push(row);
  db.audit_logs.push({
    id: generateId(),
    user_id: db.profiles[0]?.id ?? 'system',
    action: 'CREATE',
    entity_type: 'customer',
    entity_id: row.id,
    summary: buildAuditSummary('customerCreatedSummary', {
      code: row.customer_code,
    }),
    created_at: ts,
  });
  saveDb(db);
  return mapCustomer(row, db);
}

export function updateCustomer(
  id: string,
  input: Partial<Pick<DbCustomer, 'full_name' | 'phone' | 'address' | 'nic' | 'status'>>,
  db: MamDemoDb = getDb()
): Customer | undefined {
  const row = db.customers.find((c) => c.id === id);
  if (!row) return undefined;
  const ts = new Date().toISOString();
  Object.assign(row, input, { updated_at: ts });
  saveDb(db);
  return mapCustomer(row, db);
}
