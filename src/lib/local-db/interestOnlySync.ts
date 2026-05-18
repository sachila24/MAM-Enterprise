import {
  countInterestCyclesDueByDate,
  interestCyclePeriodBounds,
  nextInterestDueDateAfter,
} from '../finance/dueDates';
import {
  calculateMonthlyInterestDue,
  totalPendingInterest,
  type InterestCycleForAllocation,
} from '../finance/interestOnly';
import { generateId, saveDb } from './localDb';
import type { DbLoan, DbLoanInterestCycle, MamDemoDb } from './types';

function toAllocationCycle(c: DbLoanInterestCycle): InterestCycleForAllocation {
  return {
    id: c.id,
    cycleNumber: c.cycle_number,
    dueDate: c.due_date,
    openingPrincipal: c.opening_principal,
    interestDue: c.interest_due,
    interestPaid: c.interest_paid,
    principalPaid: c.principal_paid,
  };
}

function deriveCycleStatus(
  interestDue: number,
  interestPaid: number
): DbLoanInterestCycle['status'] {
  if (interestPaid >= interestDue) return 'PAID';
  if (interestPaid > 0) return 'PARTIAL';
  return 'PENDING';
}

function openingPrincipalForCycle(
  loan: DbLoan,
  cycles: DbLoanInterestCycle[],
  cycleNumber: number
): number {
  if (cycleNumber === 1) {
    return loan.original_principal_amount;
  }
  const prev = cycles.find((c) => c.cycle_number === cycleNumber - 1);
  return prev?.closing_principal ?? loan.original_principal_amount;
}

function refreshLoanInterestSummary(
  loan: DbLoan,
  cycles: DbLoanInterestCycle[],
  asOfDate: string,
  ts: string
): void {
  loan.pending_interest_amount = totalPendingInterest(
    cycles.map(toAllocationCycle)
  );
  loan.due_date = nextInterestDueDateAfter(loan.start_date, asOfDate);
  loan.updated_at = ts;
}

function mutateInterestOnlyCycles(
  db: MamDemoDb,
  loanId: string,
  asOfDate: string
): boolean {
  const loan = db.loans.find((l) => l.id === loanId);
  if (
    !loan ||
    loan.repayment_method !== 'INTEREST_ONLY_REDUCING_PRINCIPAL'
  ) {
    return false;
  }

  const ts = new Date().toISOString();
  const dueCount = countInterestCyclesDueByDate(loan.start_date, asOfDate);
  let changed = false;

  const cycles = db.loan_interest_cycles
    .filter((c) => c.loan_id === loanId)
    .sort((a, b) => a.cycle_number - b.cycle_number);

  for (let n = 1; n <= dueCount; n++) {
    if (cycles.some((c) => c.cycle_number === n)) continue;

    const { periodStart, periodEnd, dueDate } = interestCyclePeriodBounds(
      loan.start_date,
      n
    );
    const opening = openingPrincipalForCycle(loan, cycles, n);
    const interestDue = calculateMonthlyInterestDue(
      opening,
      loan.interest_rate
    );

    const row: DbLoanInterestCycle = {
      id: generateId(),
      loan_id: loanId,
      cycle_number: n,
      period_start: periodStart,
      period_end: periodEnd,
      due_date: dueDate,
      opening_principal: opening,
      interest_rate: loan.interest_rate,
      interest_due: interestDue,
      interest_paid: 0,
      principal_paid: 0,
      closing_principal: opening,
      status: 'PENDING',
      created_at: ts,
      updated_at: ts,
    };
    db.loan_interest_cycles.push(row);
    cycles.push(row);
    changed = true;
  }

  const allCycles = db.loan_interest_cycles
    .filter((c) => c.loan_id === loanId)
    .sort((a, b) => a.cycle_number - b.cycle_number);

  for (const cycle of allCycles) {
    const nextStatus = deriveCycleStatus(
      cycle.interest_due,
      cycle.interest_paid
    );
    if (cycle.status !== nextStatus) {
      cycle.status = nextStatus;
      cycle.updated_at = ts;
      changed = true;
    }
    const expectedClosing = Math.round(
      (cycle.opening_principal - cycle.principal_paid) * 100
    ) / 100;
    if (cycle.closing_principal !== expectedClosing) {
      cycle.closing_principal = expectedClosing;
      cycle.updated_at = ts;
      changed = true;
    }
  }

  const prevPending = loan.pending_interest_amount;
  const prevDue = loan.due_date;
  refreshLoanInterestSummary(loan, allCycles, asOfDate, ts);
  if (
    loan.pending_interest_amount !== prevPending ||
    loan.due_date !== prevDue
  ) {
    changed = true;
  }

  return changed;
}

/** Create missing cycles and save when changed. */
export function persistInterestOnlyCycles(
  db: MamDemoDb,
  loanId: string,
  asOfDate: string = new Date().toISOString().split('T')[0]
): boolean {
  const changed = mutateInterestOnlyCycles(db, loanId, asOfDate);
  if (changed) {
    saveDb(db);
  }
  return changed;
}

/** Sync every interest-only loan once (app init). */
export function syncAllInterestOnlyLoans(
  db: MamDemoDb,
  asOfDate: string = new Date().toISOString().split('T')[0]
): void {
  let changed = false;
  for (const loan of db.loans) {
    if (loan.repayment_method !== 'INTEREST_ONLY_REDUCING_PRINCIPAL') {
      continue;
    }
    if (mutateInterestOnlyCycles(db, loan.id, asOfDate)) {
      changed = true;
    }
  }
  if (changed) {
    saveDb(db);
  }
}
