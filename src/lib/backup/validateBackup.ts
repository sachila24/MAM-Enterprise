import { parseBackupJson } from '../local-db/localDb';
import type { MamDemoDb } from '../local-db/types';
import type { BackupMetaPayload } from './types';
import { BackupValidationError } from './types';

export interface ValidatedBackup {
  database: MamDemoDb;
  meta: BackupMetaPayload | null;
  /** Original raw JSON string of the database section (for restore). */
  databaseJson: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mapParseError(message: string): BackupValidationError {
  if (message.includes('Invalid JSON')) {
    return new BackupValidationError('invalid_json', message);
  }
  if (message.includes('Invalid backup format')) {
    return new BackupValidationError('invalid_format', message);
  }
  if (message.includes('version is missing')) {
    return new BackupValidationError('missing_version', message);
  }
  if (message.includes('Unsupported backup version')) {
    return new BackupValidationError('unsupported_version', message);
  }
  if (message.includes('missing required table')) {
    return new BackupValidationError('missing_table', message);
  }
  if (message.includes('invalid business settings')) {
    return new BackupValidationError('invalid_business_settings', message);
  }
  if (message.includes('invalid app password')) {
    return new BackupValidationError('invalid_app_auth', message);
  }
  if (message.includes('counters')) {
    return new BackupValidationError('invalid_counters', message);
  }
  return new BackupValidationError('validation_failed', message);
}

function readMeta(candidate: Record<string, unknown>): BackupMetaPayload | null {
  const raw = candidate.backupMeta;
  if (!isRecord(raw)) return null;
  const counts = isRecord(raw.counts) ? raw.counts : {};
  const backupType = raw.backupType;
  return {
    appVersion: typeof raw.appVersion === 'string' ? raw.appVersion : 'unknown',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
    backupType:
      backupType === 'manual' ||
      backupType === 'auto' ||
      backupType === 'restore_point'
        ? backupType
        : 'manual',
    counts: {
      bikes: Number(counts.bikes) || 0,
      customers: Number(counts.customers) || 0,
      loans: Number(counts.loans) || 0,
      payments: Number(counts.payments) || 0,
      documents: Number(counts.documents) || 0,
    },
  };
}

/**
 * Validate backup JSON (envelope or legacy flat MamDemoDb) before restore.
 * Does not write to storage.
 */
export function validateBackupPayload(raw: string): ValidatedBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BackupValidationError(
      'invalid_json',
      'Invalid JSON file.'
    );
  }

  if (!isRecord(parsed)) {
    throw new BackupValidationError(
      'invalid_format',
      'Invalid backup format.'
    );
  }

  const meta = readMeta(parsed);
  const databaseSection = isRecord(parsed.database)
    ? parsed.database
    : parsed.version === 1
      ? parsed
      : null;

  if (!databaseSection) {
    throw new BackupValidationError(
      'missing_database',
      'Backup database section is missing.'
    );
  }

  const databaseJson = JSON.stringify(databaseSection);

  try {
    const database = parseBackupJson(databaseJson);
    return { database, meta, databaseJson };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Backup validation failed.';
    throw mapParseError(message);
  }
}
