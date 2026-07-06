/** SQLite Phase 1 — types shared between migration, verification, and health UI. */

export interface EntityCounts {
  profiles?: number;
  customers: number;
  bikes: number;
  loans: number;
  payments: number;
  documents: number;
  audit_logs?: number;
}

export interface FullCollectionCounts {
  profiles: number;
  customers: number;
  bikes: number;
  loans: number;
  loan_installments: number;
  loan_interest_cycles: number;
  loan_payments: number;
  payment_allocations: number;
  documents: number;
  receipts: number;
  early_settlements: number;
  guarantees: number;
  audit_logs: number;
  cash_transactions: number;
  expenses: number;
  business_settings: number;
  app_auth: number;
  counters: number;
}

export type DatabaseHealthStatus = 'healthy' | 'warning' | 'error';

export interface CollectionVerificationRow {
  collection: keyof FullCollectionCounts;
  local: number;
  sqlite: number;
  match: boolean;
}

export interface MigrationMismatch {
  entity: string;
  source: number;
  sqlite: number;
  delta: number;
}

export interface MigrationResult {
  migrated: boolean;
  reason?: string;
  migratedAt?: string;
  sourceCounts: EntityCounts;
  sqliteCounts: EntityCounts;
  databasePath?: string;
}

export interface SyncResult {
  synced: boolean;
  syncedAt?: string;
  sourceCounts: EntityCounts;
  sqliteCounts: EntityCounts;
  mismatches: MigrationMismatch[];
  ok: boolean;
  databasePath?: string;
  reason?: string;
}

export interface SqliteHealthReport {
  ok: boolean;
  accessible: boolean;
  error?: string;
  counts: EntityCounts | null;
  migrationCompleted: boolean;
  migrationCompletedAt?: string | null;
  lastSyncAt?: string | null;
  syncCount: number;
  databasePath?: string;
}

export interface DatabaseFileStats {
  path: string;
  sizeBytes: number;
  sizeMb: number;
  exists: boolean;
  error?: string;
}

export interface FullVerificationReport {
  ok: boolean;
  rows: CollectionVerificationRow[];
  sourceCounts: FullCollectionCounts;
  sqliteCounts: FullCollectionCounts;
  mismatches: MigrationMismatch[];
  databasePath?: string;
  migrationCompleted: boolean;
  migrationCompletedAt?: string | null;
  lastSyncAt?: string | null;
}

export interface VerificationReport {
  ok: boolean;
  sourceCounts: EntityCounts;
  sqliteCounts: EntityCounts;
  mismatches: MigrationMismatch[];
  databasePath?: string;
  migrationCompleted: boolean;
  migrationCompletedAt?: string | null;
  lastSyncAt?: string | null;
}

export interface DatabaseHealthSnapshot {
  status: DatabaseHealthStatus;
  desktopAvailable: boolean;
  health: SqliteHealthReport | null;
  verification: FullVerificationReport | null;
  fileStats: DatabaseFileStats | null;
}
