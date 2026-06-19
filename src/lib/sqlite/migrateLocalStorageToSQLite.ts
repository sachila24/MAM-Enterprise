import type { MamDemoDb } from '../local-db/types';
import { STORAGE_KEY } from '../local-db/localDb';
import { localStorageAdapter } from '../../storage/localStorageAdapter';
import type { EntityCounts, MigrationResult } from './types';
import { isSqliteAvailable, runSqliteMigration } from './sqliteClient';

export function buildSourceCounts(db: MamDemoDb): EntityCounts {
  return {
    profiles: db.profiles.length,
    customers: db.customers.length,
    bikes: db.bikes.length,
    loans: db.loans.length,
    payments: db.loan_payments.length,
    documents: db.documents.length,
    audit_logs: db.audit_logs.length,
  };
}

function readLocalStorageDbJson(): string | null {
  const raw = localStorageAdapter.getItem(STORAGE_KEY);
  if (!raw?.trim()) {
    return null;
  }
  return raw;
}

/**
 * Read current localStorage database and import into SQLite.
 * Preserves IDs, timestamps, and document references.
 * Does not modify localStorage or switch the active backend.
 */
export async function migrateLocalStorageToSQLite(
  db?: MamDemoDb
): Promise<MigrationResult> {
  if (!isSqliteAvailable()) {
    return {
      migrated: false,
      reason: 'sqlite_not_available',
      sourceCounts: db
        ? buildSourceCounts(db)
        : {
            customers: 0,
            bikes: 0,
            loans: 0,
            payments: 0,
            documents: 0,
          },
      sqliteCounts: {
        customers: 0,
        bikes: 0,
        loans: 0,
        payments: 0,
        documents: 0,
      },
    };
  }

  const dbJson = db ? JSON.stringify(db) : readLocalStorageDbJson();
  if (!dbJson) {
    return {
      migrated: false,
      reason: 'no_local_storage_data',
      sourceCounts: {
        customers: 0,
        bikes: 0,
        loans: 0,
        payments: 0,
        documents: 0,
      },
      sqliteCounts: {
        customers: 0,
        bikes: 0,
        loans: 0,
        payments: 0,
        documents: 0,
      },
    };
  }

  return runSqliteMigration(dbJson);
}
