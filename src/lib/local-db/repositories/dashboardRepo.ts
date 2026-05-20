import type { ActivityLog, Customer, DashboardKpis, Loan } from '../../../types/entities';
import { getDb } from '../localDb';
import { mapCustomer, mapLoan } from '../mappers';
import type { MamDemoDb } from '../types';
import {
  daysBetweenDates,
  getFixedLoanArrearsSummary,
  oldestArrearsDueDate,
} from '../../finance/fixedInstallmentStatus';
import {
  formatActivityAction,
  formatActivitySummary,
} from '../../i18n/messages';
import { getLabel, type DisplayMode } from '../../i18n/simpleLabels';
import { getSystemToday } from '../../time/systemTime';

const today = () => getSystemToday();

function loanHasArrears(loanId: string, db: MamDemoDb, asOf: string): boolean {
  const loan = db.loans.find((l) => l.id === loanId);
  if (!loan) return false;
  if (loan.status === 'OVERDUE') return true;
  if (loan.repayment_method !== 'FIXED_TERM_INSTALLMENT') return false;

  const installments = db.loan_installments
    .filter((i) => i.loan_id === loanId)
    .map((i) => ({
      installmentNumber: i.installment_number,
      dueDate: i.due_date,
      installmentAmount: i.installment_amount,
      paidAmount: i.paid_amount,
      lateFeeAmount: i.late_fee_amount,
      lateFeePaid: i.late_fee_paid,
    }));

  return getFixedLoanArrearsSummary(
    installments,
    asOf,
    loan.late_fee_rate,
    loan.installment_amount
  ).hasArrears;
}

export function getDashboardKpis(db: MamDemoDb = getDb()): DashboardKpis {
  const asOf = today();
  const monthPrefix = asOf.slice(0, 7);

  const todayPayments = db.loan_payments.filter(
    (p) => p.status === 'CONFIRMED' && p.payment_date === asOf
  );
  const todayCollections = todayPayments.reduce((s, p) => s + p.amount, 0);

  const overdueCount = db.loans.filter(
    (l) =>
      ['ACTIVE', 'OVERDUE'].includes(l.status) && loanHasArrears(l.id, db, asOf)
  ).length;

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
): (Loan & { customer?: Customer; daysOverdue?: number })[] {
  const asOf = today();

  return db.loans
    .filter(
      (l) =>
        ['ACTIVE', 'OVERDUE'].includes(l.status) && loanHasArrears(l.id, db, asOf)
    )
    .map((l) => {
      const c = db.customers.find((x) => x.id === l.customer_id);
      const installments = db.loan_installments
        .filter((i) => i.loan_id === l.id)
        .map((i) => ({
          installmentNumber: i.installment_number,
          dueDate: i.due_date,
          installmentAmount: i.installment_amount,
          paidAmount: i.paid_amount,
          lateFeeAmount: i.late_fee_amount,
          lateFeePaid: i.late_fee_paid,
        }));
      const oldest = oldestArrearsDueDate(installments, asOf);
      const daysOverdue = oldest ? daysBetweenDates(oldest, asOf) : 0;

      return {
        ...mapLoan(l),
        status: 'OVERDUE' as const,
        customer: c ? mapCustomer(c, db) : undefined,
        daysOverdue,
      };
    });
}

export function getRecentActivity(
  db: MamDemoDb = getDb(),
  limit = 10,
  mode: DisplayMode = 'both'
): ActivityLog[] {
  return [...db.audit_logs]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
    .map((log) => ({
      id: log.id,
      when: log.created_at,
      userId: log.user_id,
      user: db.profiles.find((p) => p.id === log.user_id)?.full_name ?? getLabel('systemUser', mode),
      action: formatActivityAction(log.action, mode),
      type: mapEntityType(log.entity_type),
      summary: formatActivitySummary(log.summary, mode),
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
