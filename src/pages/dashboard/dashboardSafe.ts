import type { ActivityLog, DashboardKpis } from '../../types/entities';
import { EMPTY_DASHBOARD_KPIS } from '../../types/entities';
import type { MamDemoDb } from '../../lib/local-db/types';
import {
  getDashboardKpis,
  getOverdueLoans,
  getRecentActivity,
  type DashboardOverdueLoan,
} from '../../lib/local-db/repositories';
import { getBusinessSettingsForm } from '../../lib/local-db/repositories/settingsRepo';
import type { DisplayMode } from '../../lib/i18n/simpleLabels';

const LOG_PREFIX = '[Dashboard]';

/** Coerce unknown values to a finite number (currency/count safe). */
export function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Guard map/reduce chains against non-array backup fields. */
export function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Parse backup date fields — returns `YYYY-MM-DD` or null when invalid.
 * Dashboard skips or neutralizes entries that fail parsing.
 */
export function parseDashboardDate(value: unknown): string | null {
  if (value == null || value === '') return null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed.includes('[object')) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const head = trimmed.split('T')[0]?.split(' ')[0];
    if (head && /^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      return parseDashboardDate(parsed);
    }
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return parseDashboardDate(value.getTime());
  }

  return null;
}

function summarizeDbForLog(db: MamDemoDb): Record<string, number | string> {
  return {
    customers: safeArray(db.customers).length,
    bikes: safeArray(db.bikes).length,
    loans: safeArray(db.loans).length,
    installments: safeArray(db.loan_installments).length,
    payments: safeArray(db.loan_payments).length,
    auditLogs: safeArray(db.audit_logs).length,
  };
}

function logSectionFailure(
  section: 'kpis' | 'overdue' | 'activity' | 'business',
  err: unknown,
  db: MamDemoDb,
  extra?: Record<string, unknown>
): void {
  console.error(`${LOG_PREFIX}:${section} aggregation failed`, {
    error: err,
    db: summarizeDbForLog(db),
    ...extra,
  });
}

export function sanitizeDashboardKpis(kpis: Partial<DashboardKpis> | null | undefined): DashboardKpis {
  if (!kpis || typeof kpis !== 'object') {
    return { ...EMPTY_DASHBOARD_KPIS };
  }
  return {
    todayExpectedCollections: safeNumber(kpis.todayExpectedCollections),
    todayPaymentsCount: safeNumber(kpis.todayPaymentsCount),
    overdueCount: safeNumber(kpis.overdueCount),
    inStockCount: safeNumber(kpis.inStockCount),
    soldThisMonth: safeNumber(kpis.soldThisMonth),
  };
}

export function sanitizeOverdueLoan(loan: DashboardOverdueLoan): DashboardOverdueLoan | null {
  if (!loan?.id) return null;
  return {
    ...loan,
    loanCode: typeof loan.loanCode === 'string' ? loan.loanCode : String(loan.id),
    overdueAmount: safeNumber(loan.overdueAmount),
    daysOverdue: safeNumber(loan.daysOverdue),
    monthsOverdue: safeNumber(loan.monthsOverdue),
    customer: loan.customer
      ? {
          ...loan.customer,
          name:
            typeof loan.customer.name === 'string'
              ? loan.customer.name
              : 'Unknown customer',
          phone:
            typeof loan.customer.phone === 'string' ? loan.customer.phone : '',
        }
      : undefined,
  };
}

export function sanitizeActivityEntry(
  activity: ActivityLog
): ActivityLog | null {
  if (!activity?.id) return null;
  const when =
    parseDashboardDate(activity.when) ??
    (typeof activity.when === 'string' ? activity.when : null);
  if (!when) {
    console.warn(`${LOG_PREFIX}:activity skipping entry with invalid date`, {
      id: activity.id,
      when: activity.when,
    });
    return null;
  }
  return {
    ...activity,
    when,
    action: typeof activity.action === 'string' ? activity.action : '',
    summary: typeof activity.summary === 'string' ? activity.summary : '',
    type: activity.type ?? 'system',
  };
}

export function loadDashboardKpis(
  db: MamDemoDb,
  asOfToday: string
): DashboardKpis {
  try {
    return sanitizeDashboardKpis(getDashboardKpis(db));
  } catch (err) {
    logSectionFailure('kpis', err, db, { asOfToday });
    return { ...EMPTY_DASHBOARD_KPIS };
  }
}

export function loadOverdueLoans(db: MamDemoDb): DashboardOverdueLoan[] {
  try {
    const rows = safeArray<DashboardOverdueLoan>(getOverdueLoans(db));
    return rows
      .map((loan) => sanitizeOverdueLoan(loan))
      .filter((loan): loan is DashboardOverdueLoan => loan != null);
  } catch (err) {
    logSectionFailure('overdue', err, db);
    return [];
  }
}

export function loadRecentActivity(
  db: MamDemoDb,
  limit: number,
  mode: DisplayMode
): ActivityLog[] {
  try {
    const rows = safeArray<ActivityLog>(getRecentActivity(db, limit, mode));
    return rows
      .map((entry) => sanitizeActivityEntry(entry))
      .filter((entry): entry is ActivityLog => entry != null);
  } catch (err) {
    logSectionFailure('activity', err, db, { limit, mode });
    return [];
  }
}

export function loadBusinessName(db: MamDemoDb): string {
  try {
    const form = getBusinessSettingsForm(db);
    const name = form?.businessName;
    return typeof name === 'string' ? name.trim() : '';
  } catch (err) {
    logSectionFailure('business', err, db);
    return '';
  }
}
