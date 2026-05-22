export type OverdueSeverity = 'low' | 'medium' | 'high';

/** Display months from calendar days overdue (dashboard rule: days / 30, 1 decimal). */
export function monthsOverdueFromDays(daysOverdue: number): number {
  if (daysOverdue <= 0) return 0;
  return Math.round((daysOverdue / 30) * 10) / 10;
}

export function getOverdueSeverity(daysOverdue: number): OverdueSeverity {
  if (daysOverdue <= 30) return 'low';
  if (daysOverdue <= 90) return 'medium';
  return 'high';
}
