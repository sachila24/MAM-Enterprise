import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';

const MAX_BACKUPS = 10;

export function getBackupsDirectory() {
  return path.join(app.getPath('userData'), 'backups');
}

function safeFilenamePart(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, '-');
}

function buildFilename(meta) {
  const created = safeFilenamePart(meta.createdAt ?? new Date().toISOString());
  const type = safeFilenamePart(meta.backupType ?? 'auto');
  return `mam-backup-${type}-${created}.json`;
}

function extractMeta(parsed) {
  if (
    parsed &&
    typeof parsed === 'object' &&
    parsed.backupMeta &&
    typeof parsed.backupMeta === 'object'
  ) {
    const m = parsed.backupMeta;
    return {
      appVersion: typeof m.appVersion === 'string' ? m.appVersion : 'unknown',
      createdAt: typeof m.createdAt === 'string' ? m.createdAt : '',
      backupType:
        m.backupType === 'manual' ||
        m.backupType === 'auto' ||
        m.backupType === 'restore_point'
          ? m.backupType
          : 'auto',
      counts:
        m.counts && typeof m.counts === 'object'
          ? {
              bikes: Number(m.counts.bikes) || 0,
              customers: Number(m.counts.customers) || 0,
              loans: Number(m.counts.loans) || 0,
              payments: Number(m.counts.payments) || 0,
              documents: Number(m.counts.documents) || 0,
            }
          : {
              bikes: 0,
              customers: 0,
              loans: 0,
              payments: 0,
              documents: 0,
            },
    };
  }

  const legacy = parsed && typeof parsed === 'object' ? parsed : {};
  return {
    appVersion: 'legacy',
    createdAt: '',
    backupType: 'manual',
    counts: {
      bikes: Array.isArray(legacy.bikes) ? legacy.bikes.length : 0,
      customers: Array.isArray(legacy.customers) ? legacy.customers.length : 0,
      loans: Array.isArray(legacy.loans) ? legacy.loans.length : 0,
      payments: Array.isArray(legacy.loan_payments)
        ? legacy.loan_payments.length
        : 0,
      documents: Array.isArray(legacy.documents) ? legacy.documents.length : 0,
    },
  };
}

async function pruneOldBackups(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith('.json'))
    .map((e) => e.name);

  const withStats = await Promise.all(
    files.map(async (name) => {
      const fullPath = path.join(dir, name);
      const stat = await fs.stat(fullPath);
      return { name, fullPath, mtimeMs: stat.mtimeMs };
    })
  );

  withStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const toDelete = withStats.slice(MAX_BACKUPS);
  await Promise.all(toDelete.map((f) => fs.unlink(f.fullPath).catch(() => {})));
}

/**
 * @param {string} envelopeJson — full backup JSON written to disk
 */
export async function saveBackupToDisk(envelopeJson) {
  const dir = getBackupsDirectory();
  await fs.mkdir(dir, { recursive: true });

  let parsed;
  try {
    parsed = JSON.parse(envelopeJson);
  } catch {
    throw new Error('Invalid backup JSON.');
  }

  const meta = extractMeta(parsed);
  const filename = buildFilename(meta);
  const fullPath = path.join(dir, filename);
  await fs.writeFile(fullPath, envelopeJson, 'utf8');
  await pruneOldBackups(dir);

  const stat = await fs.stat(fullPath);
  return {
    id: filename,
    ...meta,
    sizeBytes: stat.size,
  };
}

export async function listBackupsOnDisk() {
  const dir = getBackupsDirectory();
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = entries.filter(
    (e) => e.isFile() && e.name.toLowerCase().endsWith('.json')
  );

  const rows = await Promise.all(
    files.map(async (file) => {
      const fullPath = path.join(dir, file.name);
      try {
        const [raw, stat] = await Promise.all([
          fs.readFile(fullPath, 'utf8'),
          fs.stat(fullPath),
        ]);
        const parsed = JSON.parse(raw);
        const meta = extractMeta(parsed);
        return {
          id: file.name,
          ...meta,
          createdAt: meta.createdAt || stat.mtime.toISOString(),
          sizeBytes: stat.size,
        };
      } catch {
        return null;
      }
    })
  );

  return rows
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function readBackupFromDisk(id) {
  const safeId = path.basename(id);
  if (!safeId.endsWith('.json')) {
    throw new Error('Invalid backup file name.');
  }
  const fullPath = path.join(getBackupsDirectory(), safeId);
  return fs.readFile(fullPath, 'utf8');
}

export async function deleteBackupFromDisk(id) {
  const safeId = path.basename(id);
  if (!safeId.endsWith('.json')) {
    throw new Error('Invalid backup file name.');
  }
  const fullPath = path.join(getBackupsDirectory(), safeId);
  await fs.unlink(fullPath);
}
