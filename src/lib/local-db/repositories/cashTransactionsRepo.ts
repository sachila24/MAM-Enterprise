import type { CashTransactionType, MamDemoDb } from '../types';
import { generateCode, generateId, getDb } from '../localDb';

export interface CashTransaction {
  id: string;
  transactionCode: string;
  loanId: string;
  customerId: string;
  transactionType: CashTransactionType;
  amount: number;
  transactionDate: string;
  notes?: string;
  createdAt: string;
}

function mapRow(row: MamDemoDb['cash_transactions'][number]): CashTransaction {
  return {
    id: row.id,
    transactionCode: row.transaction_code,
    loanId: row.loan_id,
    customerId: row.customer_id,
    transactionType: row.transaction_type,
    amount: row.amount,
    transactionDate: row.transaction_date,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function listCashTransactions(db: MamDemoDb = getDb()): CashTransaction[] {
  return (db.cash_transactions ?? []).map(mapRow);
}

export function listCashTransactionsForLoan(
  loanId: string,
  db: MamDemoDb = getDb()
): CashTransaction[] {
  return listCashTransactions(db).filter((t) => t.loanId === loanId);
}

export interface CreateCashTransactionInput {
  loanId: string;
  customerId: string;
  transactionType: CashTransactionType;
  amount: number;
  transactionDate: string;
  notes?: string;
}

export function createCashTransaction(
  input: CreateCashTransactionInput,
  db: MamDemoDb = getDb()
): CashTransaction {
  const ts = new Date().toISOString();
  if (!db.cash_transactions) db.cash_transactions = [];
  const row: MamDemoDb['cash_transactions'][number] = {
    id: generateId(),
    transaction_code: generateCode('TXN', db.counters),
    loan_id: input.loanId,
    customer_id: input.customerId,
    transaction_type: input.transactionType,
    amount: input.amount,
    transaction_date: input.transactionDate,
    notes: input.notes,
    created_at: ts,
  };
  db.cash_transactions.push(row);
  return mapRow(row);
}
