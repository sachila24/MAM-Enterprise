import type { Bike } from '../../../types/entities';
import { generateCode, generateId, getDb, saveDb } from '../localDb';
import { mapBike } from '../mappers';
import type { DbBike, MamDemoDb } from '../types';

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

export function createBike(
  input: Omit<DbBike, 'id' | 'bike_code' | 'created_at' | 'updated_at' | 'status'> & {
    status?: DbBike['status'];
  },
  db: MamDemoDb = getDb()
): Bike {
  const ts = new Date().toISOString();
  const row: DbBike = {
    id: generateId(),
    bike_code: generateCode('BIK', db.counters),
    status: input.status ?? 'IN_STOCK',
    created_at: ts,
    updated_at: ts,
    model: input.model,
    chassis_no: input.chassis_no,
    engine_no: input.engine_no,
    color: input.color,
    year: input.year,
    cost_price: input.cost_price,
    selling_price: input.selling_price,
    purchase_date: input.purchase_date,
  };
  db.bikes.push(row);
  saveDb(db);
  return mapBike(row);
}

export function updateBike(
  id: string,
  input: Partial<DbBike>,
  db: MamDemoDb = getDb()
): Bike | undefined {
  const row = db.bikes.find((b) => b.id === id);
  if (!row) return undefined;
  Object.assign(row, input, { updated_at: new Date().toISOString() });
  saveDb(db);
  return mapBike(row);
}
