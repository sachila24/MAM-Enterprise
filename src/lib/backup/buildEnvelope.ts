import type { MamDemoDb } from '../local-db/types';
import type { BackupEnvelope, BackupType } from './types';

/** Synced with package.json — update when releasing. */
const APP_VERSION = '0.0.1';

export function getAppVersion(): string {
  return APP_VERSION;
}

export function countBackupRecords(db: MamDemoDb) {
  return {
    bikes: Array.isArray(db.bikes) ? db.bikes.length : 0,
    customers: Array.isArray(db.customers) ? db.customers.length : 0,
    loans: Array.isArray(db.loans) ? db.loans.length : 0,
    payments: Array.isArray(db.loan_payments) ? db.loan_payments.length : 0,
    documents: Array.isArray(db.documents) ? db.documents.length : 0,
  };
}

export function buildBackupEnvelope(
  db: MamDemoDb,
  backupType: BackupType
): BackupEnvelope {
  return {
    backupMeta: {
      appVersion: APP_VERSION,
      createdAt: new Date().toISOString(),
      backupType,
      counts: countBackupRecords(db),
    },
    database: db,
  };
}

export function serializeBackupEnvelope(envelope: BackupEnvelope): string {
  return JSON.stringify(envelope, null, 2);
}
