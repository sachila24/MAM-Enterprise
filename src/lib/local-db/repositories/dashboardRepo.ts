import type { ActivityLog, Customer, DashboardKpis, Loan } from '../../../types/entities';
import { getDb } from '../localDb';
import { mapCustomer, mapLoan } from '../mappers';
import type { MamDemoDb } from '../types';

export function getDashboardKpis(db: MamDemoDb = getDb()): DashboardKpis {
  const today = new Date().toISOString().split('T')[0];
  const monthPrefix = today.slice(0, 7);

  const todayPayments = db.loan_payments.filter(
    (p) => p.status === 'CONFIRMED' && p.payment_date === today
  );
  const todayCollections = todayPayments.reduce((s, p) => s + p.amount, 0);
  const overdueCount = db.loans.filter((l) => l.status === 'OVERDUE').length;
  const outstandingPortfolio = db.loans
    .filter((l) => ['ACTIVE', 'OVERDUE'].includes(l.status))
    .reduce((s, l) => s + l.balance_amount, 0);

  const monthPayments = db.loan_payments.filter(
    (p) => p.status === 'CONFIRMED' && p.payment_date.startsWith(monthPrefix)
  );
  const monthCollections = monthPayments.reduce((s, p) => s + p.amount, 0);
  const monthExpenses = db.expenses
    .filter((e) => e.expense_date.startsWith(monthPrefix))
    .reduce((s, e) => s + e.amount, 0);

  const inStockCount = db.bikes.filter((b) => b.status === 'IN_STOCK').length;
  const soldThisMonth = db.bikes.filter(
    (b) => b.status === 'SOLD' && b.sold_date?.startsWith(monthPrefix)
  ).length;

  return {
    todayCollections,
    todayTarget: 50_000,
    todayPaymentsCount: todayPayments.length,
    overdueCount,
    cashOnHand: monthCollections - monthExpenses,
    outstandingPortfolio,
    monthNet: monthCollections - monthExpenses,
    inStockCount,
    soldThisMonth,
  };
}

export function getOverdueLoans(
  db: MamDemoDb = getDb()
): (Loan & { customer?: Customer })[] {
  return db.loans
    .filter((l) => l.status === 'OVERDUE')
    .map((l) => {
      const c = db.customers.find((x) => x.id === l.customer_id);
      return {
        ...mapLoan(l),
        customer: c ? mapCustomer(c, db) : undefined,
      };
    });
}

export function getRecentActivity(db: MamDemoDb = getDb()): ActivityLog[] {
  return [...db.audit_logs]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 10)
    .map((log) => ({
      id: log.id,
      timestamp: log.created_at,
      user: db.profiles.find((p) => p.id === log.user_id)?.full_name ?? 'System',
      action: log.action,
      type: mapEntityType(log.entity_type),
      summary: log.summary,
      referenceId: log.entity_id,
    }));
}

function mapEntityType(
  t: string
): ActivityLog['type'] {
  const map: Record<string, ActivityLog['type']> = {
    customer: 'customer',
    loan: 'loan',
    payment: 'payment',
    bike: 'bike',
    guarantee: 'guarantee',
    system: 'system',
  };
  return map[t] ?? 'system';
}
