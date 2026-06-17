import type { LabelKey } from '../i18n/simpleLabels';
import { BackupValidationError } from './types';

const CODE_TO_LABEL: Record<string, LabelKey> = {
  invalid_json: 'backupErrorInvalidJson',
  invalid_format: 'backupErrorInvalidFormat',
  missing_database: 'backupErrorMissingDatabase',
  missing_version: 'backupErrorMissingVersion',
  unsupported_version: 'backupErrorUnsupportedVersion',
  missing_table: 'backupErrorMissingTable',
  invalid_counters: 'backupErrorInvalidCounters',
  invalid_business_settings: 'backupErrorInvalidBusinessSettings',
  invalid_app_auth: 'backupErrorInvalidAppAuth',
  validation_failed: 'backupErrorValidationFailed',
};

export function backupErrorLabelKey(error: unknown): LabelKey {
  if (error instanceof BackupValidationError) {
    return CODE_TO_LABEL[error.code] ?? 'backupRestoreFailed';
  }
  return 'backupRestoreFailed';
}

export function formatBackupErrorMessage(
  error: unknown,
  t: (key: LabelKey) => string
): string {
  if (error instanceof Error && error.message.includes('restored automatically')) {
    return error.message;
  }
  if (error instanceof BackupValidationError) {
    return t(backupErrorLabelKey(error));
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return t('backupRestoreFailed');
}

export function formatFileSize(bytes: number): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
