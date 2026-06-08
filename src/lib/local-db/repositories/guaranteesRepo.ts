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
  fileNumber?: string;
  vehicleNumber?: string;
  guarantor1Name?: string;
  guarantor1Address?: string;
  guarantor1Phone?: string;
  guarantor1Nic?: string;
  guarantor2Name?: string;
  guarantor2Address?: string;
  guarantor2Phone?: string;
  guarantor2Nic?: string;
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
    item_type: 'OTHER',
    file_number: input.fileNumber,
    vehicle_number: input.vehicleNumber,
    guarantor1_name: input.guarantor1Name,
    guarantor1_address: input.guarantor1Address,
    guarantor1_phone: input.guarantor1Phone,
    guarantor1_nic: input.guarantor1Nic,
    guarantor2_name: input.guarantor2Name,
    guarantor2_address: input.guarantor2Address,
    guarantor2_phone: input.guarantor2Phone,
    guarantor2_nic: input.guarantor2Nic,
    description: '',
    storage_location: '',
    status: 'HELD',
    received_at: ts,
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

export { autoReleaseGuaranteesForSettledLoan, autoReleaseGuaranteesIfLoanJustSettled, isLoanFullySettled } from './guaranteeRelease';
