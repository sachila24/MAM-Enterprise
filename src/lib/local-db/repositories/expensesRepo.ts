import type { Expense } from '../../../types/entities';
import { generateCode, generateId, getDb, saveDb } from '../localDb';
import { mapExpense } from '../mappers';
import type { DbExpense, MamDemoDb } from '../types';

export function listExpenses(db: MamDemoDb = getDb()): Expense[] {
  return db.expenses.map(mapExpense);
}

export function createExpense(
  input: Pick<DbExpense, 'category' | 'amount' | 'expense_date' | 'notes'>,
  db: MamDemoDb = getDb()
): Expense {
  const ts = new Date().toISOString();
  const row: DbExpense = {
    id: generateId(),
    expense_code: generateCode('EXP', db.counters),
    category: input.category,
    amount: input.amount,
    expense_date: input.expense_date,
    notes: input.notes,
    created_at: ts,
  };
  db.expenses.push(row);
  saveDb(db);
  return mapExpense(row);
}
