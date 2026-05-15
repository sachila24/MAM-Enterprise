import { useSyncExternalStore } from 'react';
import { getDbSnapshot, subscribe } from './localDb';
import type { MamDemoDb } from './types';

/** Re-render when local demo DB changes. Snapshot is referentially stable between writes. */
export function useDemoDb(): MamDemoDb {
  return useSyncExternalStore(subscribe, getDbSnapshot, getDbSnapshot);
}
