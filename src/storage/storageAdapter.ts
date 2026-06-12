import { localStorageAdapter } from './localStorageAdapter';
import { sqliteAdapter } from './sqliteAdapter';

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type StorageBackend = 'localStorage' | 'sqlite';

let activeBackend: StorageBackend = 'localStorage';

/** Active persistence backend. Defaults to localStorage until SQLite migration. */
export function getStorageBackend(): StorageBackend {
  return activeBackend;
}

/** Switch backend for future SQLite migration (not used in production yet). */
export function setStorageBackend(backend: StorageBackend): void {
  activeBackend = backend;
}

export function getStorageAdapter(): StorageAdapter {
  if (activeBackend === 'sqlite') {
    return sqliteAdapter;
  }
  return localStorageAdapter;
}
