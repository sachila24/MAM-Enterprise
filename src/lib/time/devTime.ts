/**
 * Development-only simulated clock (manual date in localStorage).
 * Production builds ignore manual overrides; invalid stored values fall back to real time.
 */

import { isDevEnvironment } from '../env/isDevEnvironment';

const STORAGE_KEY = 'mam-dev-manual-date';

type DevTimeListener = () => void;
const listeners = new Set<DevTimeListener>();

function readStoredManualDate(): Date | null {
  if (!isDevEnvironment()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw?.trim()) return null;
    const parsed = new Date(raw.trim());
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredManualDate(iso: string | null): void {
  if (!isDevEnvironment()) return;
  try {
    if (iso == null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, iso);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

function notifyDevTimeListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Real wall-clock time (unaffected by dev simulation). */
export function getRealDate(): Date {
  return new Date();
}

/** App "now" — manual test date when enabled, else real time. */
export function getSystemDate(): Date {
  const manual = readStoredManualDate();
  if (manual) {
    return new Date(manual.getTime());
  }
  return getRealDate();
}

export function getSystemDateISO(): string {
  return getSystemDate().toISOString();
}

export function isManualDateEnabled(): boolean {
  return readStoredManualDate() != null;
}

/**
 * Enable or update the simulated clock (development only).
 * Accepts Date or parseable ISO / datetime-local string.
 */
export function setManualDate(input: Date | string): void {
  if (!isDevEnvironment()) return;
  const next =
    input instanceof Date ? input : new Date(String(input).trim());
  if (Number.isNaN(next.getTime())) return;
  writeStoredManualDate(next.toISOString());
  notifyDevTimeListeners();
}

export function clearManualDate(): void {
  if (!isDevEnvironment()) return;
  writeStoredManualDate(null);
  notifyDevTimeListeners();
}

/** Subscribe for React / UI refresh when simulated time changes. */
export function subscribeDevTime(listener: DevTimeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Snapshot for useSyncExternalStore — must be stable between store updates.
 * Full ISO timestamps change every millisecond and cause React error #185
 * (maximum update depth) in production when subscribed via useSystemToday.
 */
export function getDevTimeSnapshot(): string {
  const d = getSystemDate();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function advanceDays(days: number): void {
  if (!isDevEnvironment() || !Number.isFinite(days)) return;
  const d = getSystemDate();
  d.setUTCDate(d.getUTCDate() + Math.trunc(days));
  setManualDate(d);
}

export function advanceMonths(months: number): void {
  if (!isDevEnvironment() || !Number.isFinite(months)) return;
  const d = getSystemDate();
  d.setUTCMonth(d.getUTCMonth() + Math.trunc(months));
  setManualDate(d);
}

/** Format Date for `<input type="datetime-local" />` in local timezone. */
export function toDatetimeLocalValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

/** Parse datetime-local value to Date (local fields). */
export function fromDatetimeLocalValue(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
