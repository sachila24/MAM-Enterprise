/** SQLite Phase 1 — types shared between migration and verification. */

export interface EntityCounts {
  profiles?: number;
  customers: number;
  bikes: number;
  loans: number;
  payments: number;
  documents: number;
  audit_logs?: number;
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
