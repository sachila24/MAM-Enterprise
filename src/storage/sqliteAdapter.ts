import type { StorageAdapter } from './storageAdapter';
import {
  isSqliteAvailable,
  sqliteKvGet,
  sqliteKvRemove,
  sqliteKvSet,
} from '../lib/sqlite/sqliteClient';

/**
 * SQLite StorageAdapter — implemented via Electron main-process sync IPC.
 *
 * Phase 1: NOT wired as the active backend (localStorage remains in use).
 * Phase 2: switch via setStorageBackend('sqlite') after repository migration.
 */
export const sqliteAdapter: StorageAdapter = {
  getItem(key: string): string | null {
    if (!isSqliteAvailable()) {
      return null;
    }
    return sqliteKvGet(key);
  },

  setItem(key: string, value: string): void {
    if (!isSqliteAvailable()) {
      throw new Error('SQLite storage is only available in the Electron desktop app.');
    }
    sqliteKvSet(key, value);
  },

  removeItem(key: string): void {
    if (!isSqliteAvailable()) {
      throw new Error('SQLite storage is only available in the Electron desktop app.');
    }
    sqliteKvRemove(key);
  },
};
