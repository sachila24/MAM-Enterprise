import { normalizeDate } from '../time/systemTime';

/**
 * Same calendar day each month (e.g. start May 15 → due June 15, July 15).
 * Clamps to last day of month when target month is shorter (e.g. Jan 31 → Feb 28).
 */
export function addMonthsSameDay(isoDate: string, monthsToAdd: number): string {
  const base = normalizeDate(isoDate);
  const source = new Date(`${base}T12:00:00Z`);
  const targetDay = source.getUTCDate();
  const result = new Date(source);
  result.setUTCMonth(result.getUTCMonth() + monthsToAdd);

  if (result.getUTCDate() !== targetDay) {
    result.setUTCDate(0);
  }

  return normalizeDate(result);
}

/** Day-of-month (1–31) from an ISO date. */
export function dayOfMonth(isoDate: string): number {
  return new Date(`${normalizeDate(isoDate)}T12:00:00Z`).getUTCDate();
}

/** Day-of-month (1–28) taken from start date when not explicitly set. */
export function deriveDueDay(startDate: string): number {
  return dayOfMonth(startDate);
}

/** Days in calendar month (month is 1-based). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Due date on a given year-month using preferred day (1–31).
 * Clamps to the last day when the month is shorter (e.g. 30 → Feb 28/29).
 */
export function dueDateInMonth(
  year: number,
  month: number,
  preferredDay: number
): string {
  const last = daysInMonth(year, month);
  const day = Math.min(Math.max(1, preferredDay), last);
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/** Explicit preferred day, or day from first due date for legacy loans. */
export function resolvePreferredDueDay(
  firstDueDate: string,
  preferredDueDay?: number
): number {
  if (
    preferredDueDay != null &&
    preferredDueDay >= 1 &&
    preferredDueDay <= 31
  ) {
    return preferredDueDay;
  }
  return dayOfMonth(firstDueDate);
}

/**
 * Fixed-installment due date (1-based).
 * First installment uses firstDueDate exactly; later ones use preferredDueDay per month.
 */
export function computeFixedInstallmentDueDate(
  firstDueDate: string,
  installmentNumber: number,
  preferredDueDay?: number
): string {
  if (installmentNumber <= 1) {
    return normalizeDate(firstDueDate);
  }
  const day = resolvePreferredDueDay(firstDueDate, preferredDueDay);
  const base = normalizeDate(firstDueDate);
  const source = new Date(`${base}T12:00:00Z`);
  source.setUTCMonth(source.getUTCMonth() + (installmentNumber - 1));
  return dueDateInMonth(
    source.getUTCFullYear(),
    source.getUTCMonth() + 1,
    day
  );
}

/** Build due dates for fixed installments 1..count from first due date. */
export function buildFixedInstallmentDueDates(
  firstDueDate: string,
  count: number,
  preferredDueDay?: number
): string[] {
  return Array.from({ length: count }, (_, i) =>
    computeFixedInstallmentDueDate(firstDueDate, i + 1, preferredDueDay)
  );
}

/**
 * First interest/installment due date: one month after start, same day.
 * Example: start 2026-05-15 → first due 2026-06-15.
 */
export function computeFirstDueDate(startDate: string): string {
  return addMonthsSameDay(startDate, 1);
}

/** Due date for cycle/installment n (1-based): start + n months, same day. */
export function computeDueDateForCycle(
  startDate: string,
  cycleNumber: number
): string {
  return addMonthsSameDay(startDate, cycleNumber);
}

/** Build due dates for cycles 1..count from loan start. */
export function buildMonthlyDueDates(
  startDate: string,
  count: number
): string[] {
  return Array.from({ length: count }, (_, i) =>
    computeDueDateForCycle(startDate, i + 1)
  );
}

/** Number of interest cycles whose due date is on or before asOfDate. */
export function countInterestCyclesDueByDate(
  startDate: string,
  asOfDate: string
): number {
  let count = 0;
  let n = 1;
  let due = computeDueDateForCycle(startDate, n);
  while (due <= asOfDate) {
    count = n;
    n += 1;
    due = computeDueDateForCycle(startDate, n);
  }
  return count;
}

/** First due date strictly after asOfDate (next month not yet charged). */
export function nextInterestDueDateAfter(
  startDate: string,
  asOfDate: string
): string {
  const dueCount = countInterestCyclesDueByDate(startDate, asOfDate);
  return computeDueDateForCycle(startDate, dueCount + 1);
}

/** Period bounds for interest cycle n (1-based). */
export function interestCyclePeriodBounds(
  startDate: string,
  cycleNumber: number
): { periodStart: string; periodEnd: string; dueDate: string } {
  const dueDate = computeDueDateForCycle(startDate, cycleNumber);
  const periodStart =
    cycleNumber === 1
      ? startDate
      : computeDueDateForCycle(startDate, cycleNumber - 1);
  return { periodStart, periodEnd: dueDate, dueDate };
}
