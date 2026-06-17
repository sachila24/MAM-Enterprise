import type { MamDemoDb } from '../local-db/types';

export type BackupType = 'manual' | 'auto' | 'restore_point';

export interface BackupCounts {
  bikes: number;
  customers: number;
  loans: number;
  payments: number;
  documents: number;
}

export interface BackupMetaPayload {
  appVersion: string;
  createdAt: string;
  backupType: BackupType;
  counts: BackupCounts;
}

export interface BackupEnvelope {
  backupMeta: BackupMetaPayload;
  database: MamDemoDb;
}

export interface DesktopBackupListEntry {
  id: string;
  appVersion: string;
  createdAt: string;
  backupType: BackupType;
  sizeBytes: number;
  counts: BackupCounts;
}

export type BackupValidationErrorCode =
  | 'invalid_json'
  | 'invalid_format'
  | 'missing_database'
  | 'missing_version'
  | 'unsupported_version'
  | 'missing_table'
  | 'invalid_counters'
  | 'invalid_business_settings'
  | 'invalid_app_auth'
  | 'validation_failed';

export class BackupValidationError extends Error {
  readonly code: BackupValidationErrorCode;

  constructor(code: BackupValidationErrorCode, message: string) {
    super(message);
    this.name = 'BackupValidationError';
    this.code = code;
  }
}
