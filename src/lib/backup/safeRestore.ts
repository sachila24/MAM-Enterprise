import { getDb, restoreDemoDbFromBackup } from '../local-db/localDb';
import { scheduleSqliteSync } from '../sqlite/syncLocalDbToSqlite';
import {
  buildBackupEnvelope,
  serializeBackupEnvelope,
} from './buildEnvelope';
import {
  isDesktopBackupAvailable,
  listDesktopBackups,
  readDesktopBackup,
  saveDesktopBackup,
} from './desktopBackupClient';
import { validateBackupPayload } from './validateBackup';
import { BackupValidationError } from './types';

const RESTORE_POINT_SESSION_KEY = 'mam.restore.point.session';

function saveSessionRestorePoint(): void {
  if (typeof window === 'undefined') return;
  try {
    const envelope = buildBackupEnvelope(getDb(), 'restore_point');
    sessionStorage.setItem(
      RESTORE_POINT_SESSION_KEY,
      serializeBackupEnvelope(envelope)
    );
  } catch {
    /* best effort */
  }
}

function rollbackSessionRestorePoint(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(RESTORE_POINT_SESSION_KEY);
    if (!raw) return false;
    const validated = validateBackupPayload(raw);
    restoreDemoDbFromBackup(validated.databaseJson);
    return true;
  } catch {
    return false;
  } finally {
    sessionStorage.removeItem(RESTORE_POINT_SESSION_KEY);
  }
}

async function rollbackDesktopRestorePoint(): Promise<boolean> {
  if (!isDesktopBackupAvailable()) return false;
  try {
    const latest = await listDesktopBackups();
    const restorePoint = latest.find((b) => b.backupType === 'restore_point');
    if (!restorePoint) return false;
    const pointRaw = await readDesktopBackup(restorePoint.id);
    const pointValidated = validateBackupPayload(pointRaw);
    restoreDemoDbFromBackup(pointValidated.databaseJson);
    return true;
  } catch {
    return false;
  }
}

async function createRestorePoint(): Promise<void> {
  const db = getDb();
  if (isDesktopBackupAvailable()) {
    try {
      await saveDesktopBackup(db, 'restore_point');
      return;
    } catch {
      /* fall through to session snapshot */
    }
  }
  saveSessionRestorePoint();
}

/**
 * Validate, snapshot current data, restore backup, rollback on failure.
 */
export async function safeRestoreFromBackup(raw: string): Promise<void> {
  const validated = validateBackupPayload(raw);

  await createRestorePoint();

  try {
    restoreDemoDbFromBackup(validated.databaseJson);
    scheduleSqliteSync(getDb());
  } catch (error) {
    let rolledBack = await rollbackDesktopRestorePoint();
    if (!rolledBack) {
      rolledBack = rollbackSessionRestorePoint();
    }

    if (error instanceof BackupValidationError) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : 'Backup restore failed.';
    throw new Error(
      rolledBack
        ? `${message} Previous data was restored automatically.`
        : message
    );
  }
}
