import type {
  EntityCounts,
  MigrationResult,
  SqliteHealthReport,
  SyncResult,
  VerificationReport,
  FullCollectionCounts,
  FullVerificationReport,
  DatabaseFileStats,
} from './types';

function getDatabaseBridge() {
  return window.mamElectron?.database;
}

export function isSqliteAvailable(): boolean {
  return Boolean(window.mamElectron?.isDesktop && getDatabaseBridge());
}

export async function initSqliteDatabase(): Promise<{
  ok: boolean;
  path?: string;
  created?: boolean;
}> {
  const bridge = getDatabaseBridge();
  if (!bridge) {
    return { ok: false };
  }
  return bridge.init();
}

export async function runSqliteMigration(
  dbJson: string
): Promise<MigrationResult> {
  const bridge = getDatabaseBridge();
  if (!bridge) {
    throw new Error('SQLite is only available in the Electron desktop app.');
  }
  return bridge.migrate(dbJson);
}

export async function runSqliteSync(dbJson: string): Promise<SyncResult> {
  const bridge = getDatabaseBridge();
  if (!bridge) {
    throw new Error('SQLite is only available in the Electron desktop app.');
  }
  return bridge.sync(dbJson);
}

export async function runSqliteHealthCheck(): Promise<SqliteHealthReport> {
  const bridge = getDatabaseBridge();
  if (!bridge) {
    return {
      ok: false,
      accessible: false,
      error: 'SQLite is only available in the Electron desktop app.',
      counts: null,
      migrationCompleted: false,
      migrationCompletedAt: null,
      lastSyncAt: null,
      syncCount: 0,
    };
  }
  return bridge.health();
}

export async function runFullSqliteVerification(
  sourceCounts: FullCollectionCounts
): Promise<FullVerificationReport> {
  const bridge = getDatabaseBridge();
  if (!bridge?.fullVerify) {
    throw new Error('Full verification is only available in the Electron desktop app.');
  }
  return bridge.fullVerify(sourceCounts);
}

export async function runDatabaseFileStats(): Promise<DatabaseFileStats | null> {
  const bridge = getDatabaseBridge();
  if (!bridge?.fileStats) {
    return null;
  }
  return bridge.fileStats();
}

export async function runSqliteVerification(
  sourceCounts: EntityCounts
): Promise<VerificationReport> {
  const bridge = getDatabaseBridge();
  if (!bridge) {
    throw new Error('SQLite is only available in the Electron desktop app.');
  }
  return bridge.verify(sourceCounts);
}

export async function getSqliteEntityCounts(): Promise<{
  counts: EntityCounts;
  path: string;
} | null> {
  const bridge = getDatabaseBridge();
  if (!bridge) {
    return null;
  }
  return bridge.counts();
}

/** Sync key-value bridge for StorageAdapter (Phase 2). */
export function sqliteKvGet(key: string): string | null {
  const bridge = getDatabaseBridge();
  if (!bridge) {
    return null;
  }
  return bridge.kvGet(key);
}

export function sqliteKvSet(key: string, value: string): void {
  const bridge = getDatabaseBridge();
  if (!bridge) {
    throw new Error('SQLite is only available in the Electron desktop app.');
  }
  bridge.kvSet(key, value);
}

export function sqliteKvRemove(key: string): void {
  const bridge = getDatabaseBridge();
  if (!bridge) {
    throw new Error('SQLite is only available in the Electron desktop app.');
  }
  bridge.kvRemove(key);
}
