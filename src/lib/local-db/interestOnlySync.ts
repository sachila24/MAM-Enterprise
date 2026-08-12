import {
  countInterestCyclesDueByDate,
  interestCyclePeriodBounds,
  nextInterestDueDateAfter,
} from '../finance/dueDates';
import {
  calculateMonthlyInterestDue,
  deriveInterestCycleStatus,
  totalPendingInterest,
  type InterestCycleForAllocation,
} from '../finance/interestOnly';
import { roundLKR } from '../finance/money';
import { generateId, saveDb } from './localDb';
import { getSystemToday, getSystemTimestamp } from '../time/systemTime';
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

function openingPrincipalForCycle(
  loan: DbLoan,
  cycles: DbLoanInterestCycle[],
  cycleNumber: number
): number {
  if (cycleNumber === 1) {
    return loan.original_principal_amount;
  }
  const prev = cycles.find((c) => c.cycle_number === cycleNumber - 1);
  if (prev) {
    return roundLKR(prev.closing_principal);
  }
  return roundLKR(loan.current_principal_balance);
}

/** Cycle whose period contains the payment date, else the latest cycle. */
export function resolveCycleForPrincipalPayment(
  cycles: DbLoanInterestCycle[],
  paymentDate: string
): DbLoanInterestCycle | undefined {
  if (cycles.length === 0) return undefined;
  const sorted = [...cycles].sort((a, b) => a.cycle_number - b.cycle_number);
  let target = sorted[0];
  for (const cycle of sorted) {
    if (paymentDate >= cycle.period_start) {
      target = cycle;
    }
  }
  return target;
}

/** Record principal reduction on the active cycle (does not change interest_due). */
export function applyPrincipalReductionToCycle(
  cycles: DbLoanInterestCycle[],
  principalAmount: number,
  paymentDate: string,
  ts: string
): boolean {
  if (principalAmount <= 0) return false;
  const target = resolveCycleForPrincipalPayment(cycles, paymentDate);
  if (!target) return false;

  target.principal_paid = roundLKR(target.principal_paid + principalAmount);
  target.closing_principal = roundLKR(
    target.opening_principal - target.principal_paid
  );
  target.updated_at = ts;
  return true;
}

/**
 * Future cycles with no interest paid yet: align opening + interest_due with
 * prior cycle closing. Leaves paid/partial interest cycles unchanged.
 */
export function reconcilePendingFutureInterestCycles(
  cycles: DbLoanInterestCycle[],
  ts: string
): boolean {
  if (cycles.length < 2) return false;
  const sorted = [...cycles].sort((a, b) => a.cycle_number - b.cycle_number);
  let changed = false;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cycle = sorted[i]!;
    if (cycle.interest_paid > 0) continue;

    const expectedOpening = roundLKR(prev.closing_principal);
    const expectedInterest = calculateMonthlyInterestDue(
      expectedOpening,
      cycle.interest_rate
    );
    const expectedClosing = roundLKR(
      expectedOpening - cycle.principal_paid
    );

    if (
      cycle.opening_principal !== expectedOpening ||
      cycle.interest_due !== expectedInterest ||
      cycle.closing_principal !== expectedClosing
    ) {
      cycle.opening_principal = expectedOpening;
      cycle.interest_due = expectedInterest;
      cycle.closing_principal = expectedClosing;
      cycle.updated_at = ts;
      changed = true;
    }
  }

  return changed;
}

/** Backfill cycle principal_paid when loan balance was reduced outside cycle rows. */
function reconcileCyclePrincipalFromLoanBalance(
  loan: DbLoan,
  cycles: DbLoanInterestCycle[],
  ts: string
): boolean {
  if (cycles.length === 0) return false;
  const sorted = [...cycles].sort((a, b) => a.cycle_number - b.cycle_number);
  const expectedTotalPrincipalPaid = roundLKR(
    loan.original_principal_amount - loan.current_principal_balance
  );
  const recordedOnCycles = roundLKR(
    sorted.reduce((sum, c) => sum + c.principal_paid, 0)
  );
  if (expectedTotalPrincipalPaid <= recordedOnCycles) return false;

  const diff = roundLKR(expectedTotalPrincipalPaid - recordedOnCycles);
  const target = sorted[0]!;
  target.principal_paid = roundLKR(target.principal_paid + diff);
  target.closing_principal = roundLKR(
    target.opening_principal - target.principal_paid
  );
  target.updated_at = ts;
  return true;
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

  const ts = getSystemTimestamp();
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
    const nextStatus = deriveInterestCycleStatus(
      cycle.interest_due,
      cycle.interest_paid
    );
    if (cycle.status !== nextStatus) {
      cycle.status = nextStatus;
      cycle.updated_at = ts;
      changed = true;
    }
    const expectedClosing = roundLKR(
      cycle.opening_principal - cycle.principal_paid
    );
    if (cycle.closing_principal !== expectedClosing) {
      cycle.closing_principal = expectedClosing;
      cycle.updated_at = ts;
      changed = true;
    }
  }

  if (reconcileCyclePrincipalFromLoanBalance(loan, allCycles, ts)) {
    changed = true;
  }
  if (reconcilePendingFutureInterestCycles(allCycles, ts)) {
    changed = true;
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
  asOfDate: string = getSystemToday()
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
  asOfDate: string = getSystemToday()
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
