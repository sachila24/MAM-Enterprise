import type { Guarantee } from '../../../types/entities';
import { generateCode, generateId, getDb, saveDb } from '../localDb';
import { mapGuarantee } from '../mappers';
import type { DbGuarantee, MamDemoDb } from '../types';

export function listGuarantees(db: MamDemoDb = getDb()): Guarantee[] {
  return db.guarantees.map(mapGuarantee);
}

export function createGuarantee(
  input: Pick<
    DbGuarantee,
    'loan_id' | 'customer_id' | 'item_type' | 'description' | 'storage_location'
  >,
  db: MamDemoDb = getDb()
): Guarantee {
  const ts = new Date().toISOString();
  const row: DbGuarantee = {
    id: generateId(),
    guarantee_code: generateCode('GUA', db.counters),
    loan_id: input.loan_id,
    customer_id: input.customer_id,
    item_type: input.item_type,
    description: input.description,
    storage_location: input.storage_location,
    status: 'HELD',
    received_at: ts,
    created_at: ts,
  };
  db.guarantees.push(row);
  saveDb(db);
  return mapGuarantee(row);
}
