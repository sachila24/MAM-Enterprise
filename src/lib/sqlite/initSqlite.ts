import { getDb } from '../local-db/localDb';
import { migrateLocalStorageToSQLite } from './migrateLocalStorageToSQLite';
import { verifyMigration } from './verifyMigration';
import { verifySqliteHealth } from './verifySqliteHealth';
import type { MigrationResult, SqliteHealthReport, VerificationReport } from './types';
import { initSqliteDatabase, isSqliteAvailable } from './sqliteClient';

export interface SqliteBootstrapResult {
  initialized: boolean;
  migration: MigrationResult | null;
  verification: VerificationReport | null;
  health: SqliteHealthReport | null;
}

/**
 * Phase 1 startup: initialize SQLite, run one-shot migration if needed, verify counts.
 * Ongoing sync is handled by scheduleSqliteSync() after every saveDb().
 * Always reads fresh localStorage / getDb() — never a frozen startup snapshot.
 */
export async function initSqliteInfrastructure(): Promise<SqliteBootstrapResult> {
  if (!isSqliteAvailable()) {
    return {
      initialized: false,
      migration: null,
      verification: null,
      health: null,
    };
  }

  await initSqliteDatabase();

  const migration = await migrateLocalStorageToSQLite();
  const verification = await verifyMigration(getDb());
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
