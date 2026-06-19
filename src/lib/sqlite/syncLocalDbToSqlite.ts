import { getDb } from '../local-db/localDb';
import type { MamDemoDb } from '../local-db/types';
import type { EntityCounts, SyncResult } from './types';
import { buildSourceCounts } from './migrateLocalStorageToSQLite';
import { isSqliteAvailable, runSqliteSync } from './sqliteClient';

const LOG_PREFIX = '[SQLite Sync]';

function logSyncStatus(result: SyncResult): void {
  const counts = result.sourceCounts;
  if (result.ok) {
    console.info(`${LOG_PREFIX} Success`);
  } else {
    console.warn(`${LOG_PREFIX} Completed with mismatches`, result.mismatches);
  }
  console.info(`${LOG_PREFIX} Customers: ${counts.customers}`);
  console.info(`${LOG_PREFIX} Bikes: ${counts.bikes}`);
  console.info(`${LOG_PREFIX} Loans: ${counts.loans}`);
  console.info(`${LOG_PREFIX} Payments: ${counts.payments}`);
  console.info(`${LOG_PREFIX} Documents: ${counts.documents}`);
}

function emptyCounts(): EntityCounts {
  return {
    customers: 0,
    bikes: 0,
    loans: 0,
    payments: 0,
    documents: 0,
  };
}

/**
 * Write the latest localStorage collections to SQLite.
 * Preserves IDs, timestamps, and document references.
 * Never throws — callers should still treat localStorage as source of truth.
 */
export async function syncLocalDbToSqlite(db?: MamDemoDb): Promise<SyncResult> {
  const source = db ?? getDb();
  if (!isSqliteAvailable()) {
    return {
      synced: false,
      reason: 'sqlite_not_available',
      sourceCounts: buildSourceCounts(source),
      sqliteCounts: emptyCounts(),
      mismatches: [],
      ok: false,
    };
  }

  try {
    const result = await runSqliteSync(JSON.stringify(source));
    logSyncStatus(result);
    if (result.mismatches.length > 0) {
      console.warn(`${LOG_PREFIX} Count mismatches`, result.mismatches);
    }
    return result;
  } catch (err) {
    console.error(
      `${LOG_PREFIX} Failed — localStorage unaffected`,
      err instanceof Error ? err.message : err
    );
    return {
      synced: false,
      reason: 'sync_error',
      sourceCounts: buildSourceCounts(source),
      sqliteCounts: emptyCounts(),
      mismatches: [],
      ok: false,
    };
  }
}

let syncInFlight = false;
let syncPending = false;

/**
 * Queue a background sync after saveDb(). Coalesces rapid saves — only the
 * latest state is written at execution time via getDb(). Failures are logged only.
 */
export function scheduleSqliteSync(_db?: MamDemoDb): void {
  if (!isSqliteAvailable()) {
    return;
  }
  syncPending = true;
  if (syncInFlight) {
    return;
  }
  void runSyncQueue();
}

async function runSyncQueue(): Promise<void> {
  syncInFlight = true;
  while (syncPending) {
    syncPending = false;
    await syncLocalDbToSqlite();
  }
  syncInFlight = false;
}
