import type { StorageAdapter } from './storageAdapter';

/**
 * Placeholder for future SQLite persistence.
 * NOT wired in production — localStorage remains the active backend.
 */
export const sqliteAdapter: StorageAdapter = {
  getItem(): string | null {
    throw new Error('SQLite storage is not implemented yet.');
  },

  setItem(): void {
    throw new Error('SQLite storage is not implemented yet.');
  },

  removeItem(): void {
    throw new Error('SQLite storage is not implemented yet.');
  },
};
