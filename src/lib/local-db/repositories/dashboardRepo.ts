import type { ActivityLog, Customer, DashboardKpis, Loan } from '../../../types/entities';
import {
  getOverdueSeverity,
  monthsOverdueFromDays,
  type OverdueSeverity,
} from '../../finance/overdueDisplay';
import {
  runLateFeeEngine,
  type InstallmentArrearsInput,
} from '../../finance/fixedInstallmentStatus';
import { countInterestCyclesDueByDate } from '../../finance/dueDates';
import {
  interestOutstandingOnCycle,
  totalPendingInterest,
  type InterestCycleForAllocation,
} from '../../finance/interestOnly';
import { summarizeFixedInstallmentDue } from '../../finance/paymentAllocation';
import { getLateFeeLineByInstallmentId } from '../../finance/lateFeeEngineV3';
import { roundLKR } from '../../finance/money';
import {
  countOpenOverdueLoans,
  isOpenLoanStatus,
  loanHasArrears,
  overdueDaysForLoan,
} from '../../finance/loanOverdue';
import { getDb } from '../localDb';
import { mapCustomer, mapLoan } from '../mappers';
import type { MamDemoDb } from '../types';
import {
  formatActivityAction,
  formatActivitySummary,
} from '../../i18n/messages';
import { getLabel, type DisplayMode } from '../../i18n/simpleLabels';
import {
  getSystemToday,
  normalizeDate,
} from '../../time/systemTime';

const today = () => getSystemToday();

export type DashboardOverdueLoan = Loan & {
  customer?: Customer;
  daysOverdue: number;
  monthsOverdue: number;
  severity: OverdueSeverity;
};

function mapInstallments(
  loanId: string,
  db: MamDemoDb
): (InstallmentArrearsInput & { id: string })[] {
  return db.loan_installments
    .filter((i) => i.loan_id === loanId)
    .map((i) => ({
      id: i.id,
      installmentNumber: i.installment_number,
      dueDate: i.due_date,
      installmentAmount: i.installment_amount,
      paidAmount: i.paid_amount,
      lateFeeAmount: i.late_fee_amount,
      lateFeePaid: i.late_fee_paid,
    }));
}

function mapInterestCycles(
  loanId: string,
  db: MamDemoDb,
  asOf: string
): InterestCycleForAllocation[] {
  const loan = db.loans.find((l) => l.id === loanId);
  const cycles = db.loan_interest_cycles
    .filter((c) => c.loan_id === loanId)
    .sort((a, b) => a.cycle_number - b.cycle_number);
  const dueCount = loan
    ? countInterestCyclesDueByDate(loan.start_date, asOf)
    : 0;
  return cycles.map((c) => ({
    id: c.id,
    cycleNumber: c.cycle_number,
    dueDate: c.due_date,
    openingPrincipal: c.opening_principal,
    interestDue: c.interest_due,
    interestPaid: c.interest_paid,
    principalPaid: c.principal_paid,
    isCurrentCycle: c.cycle_number === dueCount,
  }));
}

function fixedDueTodayAmount(
  installments: (InstallmentArrearsInput & { id: string })[],
  asOf: string,
  lateFeeRate: number,
  monthlyInstallment?: number
): number {
  if (installments.length === 0) return 0;
  const base = monthlyInstallment ?? installments[0]?.installmentAmount ?? 0;
  const engine = runLateFeeEngine(installments, base, lateFeeRate, {
    asOfDate: asOf,
  });
  let dueToday = 0;
  for (const inst of installments) {
    if (normalizeDate(inst.dueDate) !== asOf) continue;
    const line = getLateFeeLineByInstallmentId(engine, inst.id);
    if (!line || line.status === 'PAID') continue;
    dueToday = roundLKR(
      dueToday + line.remainingInstallment + line.lateFeeOutstanding
    );
  }
  return dueToday;
}

function interestDueTodayAmount(
  cycles: InterestCycleForAllocation[],
  asOf: string
): number {
  return roundLKR(
    cycles
      .filter((c) => normalizeDate(c.dueDate) === asOf)
      .reduce((s, c) => s + interestOutstandingOnCycle(c), 0)
  );
}

function expectedCollectionForLoan(
  loanId: string,
  db: MamDemoDb,
  asOf: string
): number {
  const loan = db.loans.find((l) => l.id === loanId);
  if (!loan || !isOpenLoanStatus(loan.status)) return 0;

  if (loan.repayment_method === 'INTEREST_ONLY_REDUCING_PRINCIPAL') {
    const cycles = mapInterestCycles(loanId, db, asOf);
    if (loanHasArrears(loanId, db, asOf)) {
      return totalPendingInterest(cycles);
    }
    return interestDueTodayAmount(cycles, asOf);
  }

  if (loan.repayment_method !== 'FIXED_TERM_INSTALLMENT') return 0;

  const installments = mapInstallments(loanId, db);
  if (loanHasArrears(loanId, db, asOf)) {
    return summarizeFixedInstallmentDue(
      {
        installments,
        paymentDate: asOf,
        lateFeeRatePercent: loan.late_fee_rate,
        monthlyInstallmentAmount: loan.installment_amount,
        currentInstallmentNumber: 1,
      },
      asOf
    ).totalDue;
  }
  return fixedDueTodayAmount(
    installments,
    asOf,
    loan.late_fee_rate,
    loan.installment_amount
  );
}

export function getDashboardKpis(db: MamDemoDb = getDb()): DashboardKpis {
  const asOf = today();
  const monthPrefix = asOf.slice(0, 7);

  const todayPayments = db.loan_payments.filter(
    (p) => p.status === 'CONFIRMED' && p.payment_date === asOf
  );

  const activeLoans = db.loans.filter((l) => isOpenLoanStatus(l.status));

  const todayExpectedCollections = roundLKR(
    activeLoans.reduce(
      (s, l) => s + expectedCollectionForLoan(l.id, db, asOf),
      0
    )
  );

  const overdueCount = countOpenOverdueLoans(db, asOf);

  const inStockCount = db.bikes.filter((b) => b.status === 'IN_STOCK').length;
  const soldThisMonth = db.bikes.filter(
    (b) => b.status === 'SOLD' && b.sold_date?.startsWith(monthPrefix)
  ).length;

  return {
    todayExpectedCollections,
    todayPaymentsCount: todayPayments.length,
    overdueCount,
    inStockCount,
    soldThisMonth,
  };
}

export function getOverdueLoans(
  db: MamDemoDb = getDb()
): DashboardOverdueLoan[] {
  const asOf = today();

  return db.loans
    .filter(
      (l) => isOpenLoanStatus(l.status) && loanHasArrears(l.id, db, asOf)
    )
    .map((l) => {
      const c = db.customers.find((x) => x.id === l.customer_id);
      const daysOverdue = overdueDaysForLoan(l.id, db, asOf);
      const monthsOverdue = monthsOverdueFromDays(daysOverdue);

      return {
        ...mapLoan(l),
        status: 'OVERDUE' as const,
        customer: c ? mapCustomer(c, db) : undefined,
        daysOverdue,
        monthsOverdue,
        severity: getOverdueSeverity(daysOverdue),
      };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
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
