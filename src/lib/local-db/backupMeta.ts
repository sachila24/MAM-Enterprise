const BACKUP_META_KEY = 'mam.backup.meta';

export interface BackupMeta {
  lastBackupAt?: string;
  lastRestoreAt?: string;
}

function readMeta(): BackupMeta {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(BACKUP_META_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const record = parsed as Record<string, unknown>;
    const meta: BackupMeta = {};
    if (typeof record.lastBackupAt === 'string') {
      meta.lastBackupAt = record.lastBackupAt;
    }
    if (typeof record.lastRestoreAt === 'string') {
      meta.lastRestoreAt = record.lastRestoreAt;
    }
    return meta;
  } catch {
    return {};
  }
}

function writeMeta(meta: BackupMeta): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BACKUP_META_KEY, JSON.stringify(meta));
}

export function getBackupMeta(): BackupMeta {
  return readMeta();
}

export function recordBackupDownload(at: string = new Date().toISOString()): void {
  const meta = readMeta();
  writeMeta({ ...meta, lastBackupAt: at });
}

export function recordBackupRestore(at: string = new Date().toISOString()): void {
  const meta = readMeta();
  writeMeta({ ...meta, lastRestoreAt: at });
}
