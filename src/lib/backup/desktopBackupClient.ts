import { getDb } from '../local-db/localDb';
import type { MamDemoDb } from '../local-db/types';
import type { DesktopBackupListEntry, BackupType } from './types';
import {
  buildBackupEnvelope,
  serializeBackupEnvelope,
} from './buildEnvelope';

function getBridge() {
  return typeof window !== 'undefined' ? window.mamElectron : undefined;
}

export function isDesktopBackupAvailable(): boolean {
  return Boolean(getBridge()?.backup);
}

export async function saveDesktopBackup(
  db: MamDemoDb = getDb(),
  backupType: BackupType = 'auto'
): Promise<DesktopBackupListEntry | null> {
  const bridge = getBridge()?.backup;
  if (!bridge) return null;
  const envelope = buildBackupEnvelope(db, backupType);
  const json = serializeBackupEnvelope(envelope);
  return bridge.save(json);
}

export async function listDesktopBackups(): Promise<DesktopBackupListEntry[]> {
  const bridge = getBridge()?.backup;
  if (!bridge) return [];
  try {
    const rows = await bridge.list();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export async function readDesktopBackup(id: string): Promise<string> {
  const bridge = getBridge()?.backup;
  if (!bridge) {
    throw new Error('Desktop backup is not available.');
  }
  return bridge.read(id);
}

export async function deleteDesktopBackup(id: string): Promise<void> {
  const bridge = getBridge()?.backup;
  if (!bridge) {
    throw new Error('Desktop backup is not available.');
  }
  await bridge.delete(id);
}
