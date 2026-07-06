import type { DesktopBackupListEntry } from '../backup/types';
import type {
  EntityCounts,
  MigrationResult,
  SqliteHealthReport,
  SyncResult,
  VerificationReport,
  FullCollectionCounts,
  FullVerificationReport,
  DatabaseFileStats,
} from '../sqlite/types';

export interface MamElectronDatabaseBridge {
  init: () => Promise<{ ok: boolean; path?: string; created?: boolean }>;
  migrate: (dbJson: string) => Promise<MigrationResult>;
  sync: (dbJson: string) => Promise<SyncResult>;
  verify: (sourceCounts: EntityCounts) => Promise<VerificationReport>;
  fullVerify: (sourceCounts: FullCollectionCounts) => Promise<FullVerificationReport>;
  health: () => Promise<SqliteHealthReport>;
  fileStats: () => Promise<DatabaseFileStats>;
  counts: () => Promise<{ counts: EntityCounts; path: string }>;
  kvGet: (key: string) => string | null;
  kvSet: (key: string, value: string) => boolean;
  kvRemove: (key: string) => boolean;
}

export interface MamElectronBackupBridge {
  save: (envelopeJson: string) => Promise<DesktopBackupListEntry>;
  list: () => Promise<DesktopBackupListEntry[]>;
  read: (id: string) => Promise<string>;
  delete: (id: string) => Promise<void>;
}

export interface MamElectronBridge {
  isDesktop: boolean;
  print: () => Promise<{ ok: boolean; reason?: string }>;
  backup?: MamElectronBackupBridge;
  database?: MamElectronDatabaseBridge;
  onAppClosing?: (handler: () => void) => () => void;
  notifyCloseBackupDone?: () => void;
}

declare global {
  interface Window {
    mamElectron?: MamElectronBridge;
  }
}

export {};
