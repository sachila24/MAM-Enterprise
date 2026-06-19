import type { MamDemoDb } from '../local-db/types';
import { migrateLocalStorageToSQLite } from './migrateLocalStorageToSQLite';
import { syncLocalDbToSqlite } from './syncLocalDbToSqlite';
import { verifyMigration } from './verifyMigration';
import { verifySqliteHealth } from './verifySqliteHealth';
import type { MigrationResult, SqliteHealthReport, SyncResult, VerificationReport } from './types';
import { initSqliteDatabase, isSqliteAvailable } from './sqliteClient';

export interface SqliteBootstrapResult {
  initialized: boolean;
  migration: MigrationResult | null;
  sync: SyncResult | null;
  verification: VerificationReport | null;
  health: SqliteHealthReport | null;
}

/**
 * Phase 1 startup: initialize SQLite, sync from localStorage, verify counts.
 * localStorage remains the active backend — repositories are unchanged.
 */
export async function initSqliteInfrastructure(
  db: MamDemoDb
): Promise<SqliteBootstrapResult> {
  if (!isSqliteAvailable()) {
    return {
      initialized: false,
      migration: null,
      sync: null,
      verification: null,
      health: null,
    };
  }

  await initSqliteDatabase();

  const migration = await migrateLocalStorageToSQLite(db);
  const sync = await syncLocalDbToSqlite(db);
  const verification = await verifyMigration(db);
  const health = await verifySqliteHealth();

  if (migration.migrated) {
    console.info('[SQLite] Migration completed', migration);
  }

  if (verification.ok) {
    console.info('[SQLite] Verification passed', verification);
  } else {
    console.warn('[SQLite] Verification mismatches detected', verification);
  }

  return {
    initialized: true,
    migration,
    sync,
    verification,
    health,
  };
}

export {
  migrateLocalStorageToSQLite,
  buildSourceCounts,
} from './migrateLocalStorageToSQLite';
export { syncLocalDbToSqlite, scheduleSqliteSync } from './syncLocalDbToSqlite';
export { verifyMigration } from './verifyMigration';
export { verifySqliteHealth } from './verifySqliteHealth';
export type {
  EntityCounts,
  MigrationResult,
  MigrationMismatch,
  VerificationReport,
  SyncResult,
  SqliteHealthReport,
} from './types';
