import type { StorageAdapter } from './storageAdapter';

/** Wraps browser localStorage — current production persistence layer. */
export const localStorageAdapter: StorageAdapter = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  },

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
};
