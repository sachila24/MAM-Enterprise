/**
 * Single source of truth for loan overdue / arrears across dashboard, loans list, and reports.
 */

import {
  daysBetweenDates,
  getFixedLoanArrearsSummary,
  oldestArrearsDueDate,
  type InstallmentArrearsInput,
} from './fixedInstallmentStatus';
import { countInterestCyclesDueByDate } from './dueDates';
import {
  interestOutstandingOnCycle,
  totalPendingInterest,
  type InterestCycleForAllocation,
} from './interestOnly';
import type { MamDemoDb } from '../local-db/types';
import { getSystemToday, isDateBefore } from '../time/systemTime';

export type LoanListStatus = 'ACTIVE' | 'OVERDUE' | 'COMPLETED';

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

/** Whether an open loan has computed arrears as of the given date. */
export function loanHasArrears(
  loanId: string,
  db: MamDemoDb,
  asOf: string = getSystemToday()
): boolean {
  const loan = db.loans.find((l) => l.id === loanId);
  if (!loan) return false;
  if (!['ACTIVE', 'OVERDUE'].includes(loan.status)) return false;
  if (loan.status === 'OVERDUE') return true;

  if (loan.repayment_method === 'INTEREST_ONLY_REDUCING_PRINCIPAL') {
    const cycles = mapInterestCycles(loanId, db, asOf);
    return totalPendingInterest(cycles) > 0;
  }

  if (loan.repayment_method !== 'FIXED_TERM_INSTALLMENT') return false;

  const installments = mapInstallments(loanId, db);
  return getFixedLoanArrearsSummary(
    installments,
    asOf,
    loan.late_fee_rate,
    loan.installment_amount
  ).hasArrears;
}

/** Whole days since the oldest unpaid overdue obligation. */
export function overdueDaysForLoan(
  loanId: string,
  db: MamDemoDb,
  asOf: string = getSystemToday()
): number {
  const loan = db.loans.find((l) => l.id === loanId);
  if (!loan) return 0;

  if (loan.repayment_method === 'INTEREST_ONLY_REDUCING_PRINCIPAL') {
    const cycles = mapInterestCycles(loanId, db, asOf);
    const oldest = cycles
      .filter(
        (c) =>
          interestOutstandingOnCycle(c) > 0 && isDateBefore(c.dueDate, asOf)
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    return oldest ? daysBetweenDates(oldest.dueDate, asOf) : 0;
  }

  const installments = mapInstallments(loanId, db);
  const oldest = oldestArrearsDueDate(installments, asOf);
  return oldest ? daysBetweenDates(oldest, asOf) : 0;
}

export function isOpenLoanStatus(status: string): boolean {
  return status === 'ACTIVE' || status === 'OVERDUE';
}

/** Loans list / filter status — overdue uses the same arrears engine as the dashboard. */
export function getLoanListStatus(
  db: MamDemoDb,
  loan: { id: string; status: string; balanceAmount: number },
  asOf: string = getSystemToday()
): LoanListStatus {
  if (
    loan.status === 'COMPLETED' ||
    loan.status === 'SETTLED' ||
    loan.balanceAmount <= 0
  ) {
    return 'COMPLETED';
  }
  if (!isOpenLoanStatus(loan.status)) {
    return 'COMPLETED';
  }
  return loanHasArrears(loan.id, db, asOf) ? 'OVERDUE' : 'ACTIVE';
}

export function countOpenOverdueLoans(
  db: MamDemoDb,
  asOf: string = getSystemToday()
): number {
  return db.loans.filter(
    (l) => isOpenLoanStatus(l.status) && loanHasArrears(l.id, db, asOf)
  ).length;
}

export function listOpenOverdueLoanIds(
  db: MamDemoDb,
  asOf: string = getSystemToday()
): string[] {
  return db.loans
    .filter(
      (l) => isOpenLoanStatus(l.status) && loanHasArrears(l.id, db, asOf)
    )
    .map((l) => l.id);
}
