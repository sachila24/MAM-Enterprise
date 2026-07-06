import { getDb } from '../local-db/localDb';
import type { FullVerificationReport } from './types';
import { buildFullSourceCounts } from './buildFullCounts';
import { isSqliteAvailable } from './sqliteClient';

export async function runFullVerification(
  db = getDb()
): Promise<FullVerificationReport> {
  const sourceCounts = buildFullSourceCounts(db);

  if (!isSqliteAvailable()) {
    return {
      ok: false,
      rows: [],
      sourceCounts,
      sqliteCounts: {
        profiles: 0,
        customers: 0,
        bikes: 0,
        loans: 0,
        loan_installments: 0,
        loan_interest_cycles: 0,
        loan_payments: 0,
        payment_allocations: 0,
        documents: 0,
        receipts: 0,
        early_settlements: 0,
        guarantees: 0,
        audit_logs: 0,
        cash_transactions: 0,
        expenses: 0,
        business_settings: 0,
        app_auth: 0,
        counters: 0,
      },
      mismatches: [
        {
          entity: 'sqlite',
          source: 1,
          sqlite: 0,
          delta: -1,
        },
      ],
      migrationCompleted: false,
      migrationCompletedAt: null,
      lastSyncAt: null,
    };
  }

  const bridge = window.mamElectron!.database!;
  return bridge.fullVerify(sourceCounts);
}
