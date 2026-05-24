/**
 * Centralized calendar dates for finance logic (timezone-safe, UTC-based).
 * UI display formatting may still use locale formatters elsewhere.
 */

import { useSyncExternalStore } from 'react';
import {
  getRealDate,
  getSystemDate,
  getDevTimeSnapshot,
  subscribeDevTime,
} from './devTime';

export { getSystemDate } from './devTime';

/** YYYY-MM-DD in UTC — single source of truth for "today" in business logic. */
export function getSystemToday(): string {
  const now = getSystemDate();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Strip time; return YYYY-MM-DD for comparisons and engine input. */
export function normalizeDate(
  date: string | Date | null | undefined
): string {
  if (date == null || date === '') {
    return getSystemToday();
  }
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const head = trimmed.split('T')[0]?.split(' ')[0];
    if (head && /^\d{4}-\d{2}-\d{2}$/.test(head)) {
      return head;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return normalizeDate(parsed);
    }
    return getSystemToday();
  }
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Business as-of date: explicit input or system today. */
export function getAsOfDate(inputDate?: string | null): string {
  if (inputDate != null && String(inputDate).trim() !== '') {
    return normalizeDate(inputDate);
  }
  return getSystemToday();
}

export function compareDateOnly(a: string, b: string): number {
  const da = normalizeDate(a);
  const db = normalizeDate(b);
  if (da < db) return -1;
  if (da > db) return 1;
  return 0;
}

export function isDateBefore(a: string, b: string): boolean {
  return compareDateOnly(a, b) < 0;
}

export function isDateOnOrBefore(a: string, b: string): boolean {
  return compareDateOnly(a, b) <= 0;
}

/** Whole calendar days between two YYYY-MM-DD dates (inclusive of progression, non-negative). */
export function daysBetweenDates(fromDate: string, toDate: string): number {
  const from = new Date(`${normalizeDate(fromDate)}T12:00:00Z`);
  const to = new Date(`${normalizeDate(toDate)}T12:00:00Z`);
  return Math.max(
    0,
    Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
  );
}

/** Add calendar days to a YYYY-MM-DD date (UTC-safe). */
export function addDaysToDate(date: string, days: number): string {
  const d = new Date(`${normalizeDate(date)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Late months for one installment: floor((asOf − dueDate) / 30).
 * Zero when asOf is on or before the due date.
 * @deprecated For late-fee accrual use calculateLateFeeCyclesFromGraceEnd.
 */
export function calculateLateMonthsFromDueDate(
  dueDate: string,
  asOfDate: string
): number {
  if (compareDateOnly(asOfDate, dueDate) <= 0) return 0;
  return Math.floor(daysBetweenDates(dueDate, asOfDate) / 30);
}

function calendarYearMonth(date: string): { year: number; month: number } {
  const [year, month] = normalizeDate(date).split('-').map(Number);
  return { year, month };
}

/**
 * Inclusive calendar-month cycles from grace-end through as-of.
 * e.g. cycle start Feb 8, as-of Apr 26 → Feb + Mar + Apr = 3 cycles.
 * Zero when as-of is before cycle start.
 */
export function calculateLateFeeCyclesFromGraceEnd(
  cycleStartDate: string,
  asOfDate: string
): number {
  const start = normalizeDate(cycleStartDate);
  const asOf = normalizeDate(asOfDate);
  if (compareDateOnly(asOf, start) < 0) return 0;

  const s = calendarYearMonth(start);
  const e = calendarYearMonth(asOf);
  return (e.year - s.year) * 12 + (e.month - s.month) + 1;
}

/** Live clock for UI greetings and finance "now" (respects dev simulation). */
export function getSystemTime(): Date {
  return getSystemDate();
}

/** Re-render when dev simulated date changes (or on each render in production). */
export function useSystemToday(): string {
  useSyncExternalStore(subscribeDevTime, getDevTimeSnapshot, getDevTimeSnapshot);
  return getSystemToday();
}

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

/** Morning 05:00–11:59, afternoon 12:00–17:59, evening 18:00–04:59. */
export function getGreetingPeriod(date: Date = getSystemTime()): GreetingPeriod {
  const hour = date.getHours();
  if (hour >= 5 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 17) return 'afternoon';
  return 'evening';
}

/** ISO timestamp for audit rows — always real wall clock (not simulated). */
export function getSystemTimestamp(): string {
  return getRealDate().toISOString();
}

/** Temporary diagnostic — call from devtools or once on loan detail load. */
export function debugTimeContext(label = 'TIME_DEBUG'): void {
  const now = getSystemDate();
  const real = getRealDate();
  console.log(label, {
    simulated: now.toString(),
    simulatedUtcIso: now.toISOString(),
    realWallClock: real.toString(),
    utcDateOnly: getSystemToday(),
    timezoneOffsetMinutes: now.getTimezoneOffset(),
    executionContext:
      typeof globalThis !== 'undefined' &&
      typeof (globalThis as { window?: unknown }).window !== 'undefined'
        ? 'browser'
        : 'node',
  });
}
