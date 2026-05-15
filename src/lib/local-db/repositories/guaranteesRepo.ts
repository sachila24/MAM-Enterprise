import type { Guarantee } from '../../../types/entities';
import { generateCode, generateId, getDb, saveDb } from '../localDb';
import { mapGuarantee } from '../mappers';
import type { DbGuarantee, MamDemoDb } from '../types';

export function listGuarantees(db: MamDemoDb = getDb()): Guarantee[] {
  return db.guarantees.map(mapGuarantee);
}

export function getGuarantee(id: string, db: MamDemoDb = getDb()): Guarantee | undefined {
  const row = db.guarantees.find((g) => g.id === id);
  return row ? mapGuarantee(row) : undefined;
}

export interface CreateGuaranteeInput {
  loanId: string;
  customerId: string;
  itemType: DbGuarantee['item_type'];
  description: string;
  storageLocation: string;
  receivedAt: string;
  itemReference?: string;
  ownerNameOnDocument?: string;
  notes?: string;
}

export function createGuarantee(
  input: CreateGuaranteeInput,
  db: MamDemoDb = getDb()
): Guarantee {
  const ts = new Date().toISOString();
  const row: DbGuarantee = {
    id: generateId(),
    guarantee_code: generateCode('GUA', db.counters),
    loan_id: input.loanId,
    customer_id: input.customerId,
    item_type: input.itemType,
    description: input.description,
    storage_location: input.storageLocation,
    status: 'HELD',
    received_at: input.receivedAt,
    item_reference: input.itemReference,
    owner_name_on_document: input.ownerNameOnDocument,
    notes: input.notes,
    created_at: ts,
  };
  db.guarantees.push(row);
  saveDb(db);
  return mapGuarantee(row);
}

export function releaseGuarantee(
  id: string,
  releasedTo: string | undefined,
  db: MamDemoDb = getDb()
): Guarantee | undefined {
  const row = db.guarantees.find((g) => g.id === id);
  if (!row || row.status === 'RELEASED') return undefined;
  const ts = new Date().toISOString();
  row.status = 'RELEASED';
  row.released_at = ts;
  row.released_to = releasedTo;
  saveDb(db);
  return mapGuarantee(row);
}
