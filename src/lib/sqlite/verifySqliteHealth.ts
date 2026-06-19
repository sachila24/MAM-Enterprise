import type { SqliteHealthReport } from './types';
import { isSqliteAvailable, runSqliteHealthCheck } from './sqliteClient';

const LOG_PREFIX = '[SQLite Health]';

/**
 * Check database accessibility, table counts, and migration/sync status.
 */
export async function verifySqliteHealth(): Promise<SqliteHealthReport> {
  if (!isSqliteAvailable()) {
    const report: SqliteHealthReport = {
      ok: false,
      accessible: false,
      error: 'SQLite is only available in the Electron desktop app.',
      counts: null,
      migrationCompleted: false,
      migrationCompletedAt: null,
      lastSyncAt: null,
      syncCount: 0,
    };
    console.warn(`${LOG_PREFIX} Unavailable`, report.error);
    return report;
  }

  const report = await runSqliteHealthCheck();

  if (report.ok) {
    console.info(`${LOG_PREFIX} OK`, {
      path: report.databasePath,
      counts: report.counts,
      lastSyncAt: report.lastSyncAt,
      syncCount: report.syncCount,
      migrationCompleted: report.migrationCompleted,
    });
  } else {
    console.error(`${LOG_PREFIX} Failed`, report.error);
  }

  return report;
}
