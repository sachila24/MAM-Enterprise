import type { MamDemoDb } from '../local-db/types';
import type { EntityCounts, VerificationReport } from './types';
import { buildSourceCounts } from './migrateLocalStorageToSQLite';
import { isSqliteAvailable, runSqliteVerification } from './sqliteClient';

/**
 * Compare entity counts between localStorage (source) and SQLite after migration.
 */
export async function verifyMigration(
  db: MamDemoDb
): Promise<VerificationReport> {
  const sourceCounts = buildSourceCounts(db);

  if (!isSqliteAvailable()) {
    return {
      ok: false,
      sourceCounts,
      sqliteCounts: {
        customers: 0,
        bikes: 0,
        loans: 0,
        payments: 0,
        documents: 0,
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
    };
  }

  return runSqliteVerification(sourceCounts);
}

export type { EntityCounts, VerificationReport };
