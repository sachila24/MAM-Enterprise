import { getDb } from './localDb';
import {
  buildBackupEnvelope,
  serializeBackupEnvelope,
} from '../backup/buildEnvelope';

function formatBackupFilename(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `mam-backup-${y}-${m}-${d}-${h}-${min}.json`;
}

/** Export full database snapshot (with metadata envelope) and trigger download. */
export function downloadFullDatabaseBackup(): void {
  const db = getDb();
  const envelope = buildBackupEnvelope(db, 'manual');
  const json = serializeBackupEnvelope(envelope);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = formatBackupFilename(new Date());
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}
