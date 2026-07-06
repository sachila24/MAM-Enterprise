import type { MamDemoDb } from '../local-db/types';
import type { FullCollectionCounts } from './types';

/** Build collection counts from the current in-memory / localStorage database. */
export function buildFullSourceCounts(db: MamDemoDb): FullCollectionCounts {
  return {
    profiles: db.profiles.length,
    customers: db.customers.length,
    bikes: db.bikes.length,
    loans: db.loans.length,
    loan_installments: db.loan_installments.length,
    loan_interest_cycles: db.loan_interest_cycles.length,
    loan_payments: db.loan_payments.length,
    payment_allocations: db.payment_allocations.length,
    documents: db.documents.length,
    receipts: db.receipts.length,
    early_settlements: db.early_settlements.length,
    guarantees: db.guarantees.length,
    audit_logs: db.audit_logs.length,
    cash_transactions: db.cash_transactions.length,
    expenses: db.expenses.length,
    business_settings: db.business_settings ? 1 : 0,
    app_auth: db.app_auth ? 1 : 0,
    counters: Object.keys(db.counters ?? {}).length,
  };
}
