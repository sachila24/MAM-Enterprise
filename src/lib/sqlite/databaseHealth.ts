import type {
  DatabaseHealthSnapshot,
  DatabaseHealthStatus,
  FullVerificationReport,
  SqliteHealthReport,
} from './types';
import { runFullVerification } from './verifyFullMigration';
import { isSqliteAvailable, runSqliteHealthCheck } from './sqliteClient';
import type { DatabaseFileStats } from './types';

function deriveHealthStatus(
  health: SqliteHealthReport | null,
  verification: FullVerificationReport | null,
  desktopAvailable: boolean
): DatabaseHealthStatus {
  if (!desktopAvailable || !health?.accessible) {
    return 'error';
  }
  if (!verification?.ok) {
    return 'warning';
  }
  return 'healthy';
}

async function loadFileStats(): Promise<DatabaseFileStats | null> {
  const bridge = window.mamElectron?.database;
  if (!bridge?.fileStats) {
    return null;
  }
  return bridge.fileStats();
}

export async function loadDatabaseHealthSnapshot(): Promise<DatabaseHealthSnapshot> {
  const desktopAvailable = isSqliteAvailable();

  if (!desktopAvailable) {
    return {
      status: 'error',
      desktopAvailable: false,
      health: null,
      verification: null,
      fileStats: null,
    };
  }

  const [health, verification, fileStats] = await Promise.all([
    runSqliteHealthCheck(),
    runFullVerification(),
    loadFileStats(),
  ]);

  const status = deriveHealthStatus(health, verification, desktopAvailable);

  return {
    status,
    desktopAvailable,
    health,
    verification,
    fileStats,
  };
}

export async function verifyDatabaseNow(): Promise<DatabaseHealthSnapshot> {
  return loadDatabaseHealthSnapshot();
}

export async function refreshDatabaseHealth(): Promise<DatabaseHealthSnapshot> {
  return loadDatabaseHealthSnapshot();
}

export function getHealthStatusLabelKey(
  status: DatabaseHealthStatus
): 'dbHealthStatusHealthy' | 'dbHealthStatusWarning' | 'dbHealthStatusError' {
  if (status === 'healthy') return 'dbHealthStatusHealthy';
  if (status === 'warning') return 'dbHealthStatusWarning';
  return 'dbHealthStatusError';
}
