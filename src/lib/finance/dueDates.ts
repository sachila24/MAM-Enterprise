/**
 * Same calendar day each month (e.g. start May 15 → due June 15, July 15).
 * Clamps to last day of month when target month is shorter (e.g. Jan 31 → Feb 28).
 */

export function addMonthsSameDay(isoDate: string, monthsToAdd: number): string {
  const source = new Date(isoDate + 'T12:00:00');
  const targetDay = source.getDate();
  const result = new Date(source);
  result.setMonth(result.getMonth() + monthsToAdd);

  if (result.getDate() !== targetDay) {
    result.setDate(0);
  }

  return result.toISOString().split('T')[0];
}

/** Day-of-month (1–28) taken from start date when not explicitly set. */
export function deriveDueDay(startDate: string): number {
  return new Date(startDate + 'T12:00:00').getDate();
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
