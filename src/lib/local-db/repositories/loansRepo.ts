import {
  buildFixedInstallmentSchedule,
  calculateFixedInstallmentTotals,
} from '../../finance/fixedInstallment';
import {
  calculateMonthlyInterestDue,
  calculateInterestOnlyCycleAmounts,
} from '../../finance/interestOnly';
import { computeFirstDueDate } from '../../finance/dueDates';
import type { Loan, LoanPurpose, RepaymentMethod } from '../../../types/loan';
import { generateId, getDb, saveDb } from '../localDb';
import { mapLoan } from '../mappers';
import { getLoanDetailFromDb } from '../loanDetail';
import type { DbLoan, MamDemoDb } from '../types';

export { getLoanDetailFromDb };

export interface CreateLoanInput {
  customerId: string;
  loanPurpose: LoanPurpose;
  repaymentMethod: RepaymentMethod;
  principalAmount: number;
  interestRate: number;
  termMonths?: number;
  lateFeeRate: number;
  discountAmount: number;
  startDate: string;
  firstDueDate: string;
  dueDay?: number;
  bikeId?: string;
  notes?: string;
}

function nextLoanCode(
  purpose: LoanPurpose,
  method: RepaymentMethod,
  counters: Record<string, number>
): string {
  const key =
    purpose === 'BIKE_INSTALLMENT'
      ? 'LN-BIKE'
      : method === 'INTEREST_ONLY_REDUCING_PRINCIPAL'
        ? 'LN-IO'
        : 'LN-FIX';
  const next = (counters[key] ?? 0) + 1;
  counters[key] = next;
  return `${key}-${String(next).padStart(4, '0')}`;
}

export function listLoans(db: MamDemoDb = getDb()): Loan[] {
  return db.loans.map(mapLoan);
}

export function getLoan(id: string, db: MamDemoDb = getDb()): Loan | undefined {
  const row = db.loans.find((l) => l.id === id);
  return row ? mapLoan(row) : undefined;
}

export function createLoan(
  input: CreateLoanInput,
  db: MamDemoDb = getDb()
): Loan {
  const ts = new Date().toISOString();
  const id = generateId();
  const isInterestOnly =
    input.repaymentMethod === 'INTEREST_ONLY_REDUCING_PRINCIPAL';
  const isBike = input.loanPurpose === 'BIKE_INSTALLMENT';
  const loanCode = nextLoanCode(
    input.loanPurpose,
    input.repaymentMethod,
    db.counters
  );

  let dbLoan: DbLoan;

  if (isInterestOnly) {
    const principal = input.principalAmount;
    const monthlyInterest = calculateMonthlyInterestDue(
      principal,
      input.interestRate
    );
    const firstDue =
      input.firstDueDate || computeFirstDueDate(input.startDate);

    dbLoan = {
      id,
      loan_code: loanCode,
      loan_purpose: input.loanPurpose,
      repayment_method: input.repaymentMethod,
      customer_id: input.customerId,
      bike_id: input.bikeId,
      principal_amount: principal,
      original_principal_amount: principal,
      current_principal_balance: principal,
      interest_rate: input.interestRate,
      interest_rate_period: 'MONTHLY',
      interest_calculation_type: 'REDUCING_PRINCIPAL',
      discount_amount: input.discountAmount,
      paid_amount: 0,
      balance_amount: principal,
      late_fee_rate: 0,
      start_date: input.startDate,
      first_due_date: firstDue,
      due_day: input.dueDay ?? 15,
      due_date: firstDue,
      minimum_months_before_settlement: 6,
      status: 'ACTIVE',
      pending_interest_amount: monthlyInterest,
      notes: input.notes,
      created_at: ts,
      updated_at: ts,
    };

    const cycleAmounts = calculateInterestOnlyCycleAmounts({
      openingPrincipal: principal,
      monthlyInterestRatePercent: input.interestRate,
    });

    db.loan_interest_cycles.push({
      id: generateId(),
      loan_id: id,
      cycle_number: 1,
      period_start: input.startDate,
      period_end: firstDue,
      due_date: firstDue,
      opening_principal: principal,
      interest_rate: input.interestRate,
      interest_due: cycleAmounts.interestDue,
      interest_paid: 0,
      principal_paid: 0,
      closing_principal: principal,
      status: 'PENDING',
      created_at: ts,
      updated_at: ts,
    });
  } else {
    const totals = calculateFixedInstallmentTotals({
      financeAmount: input.principalAmount,
      termMonths: input.termMonths ?? 36,
      monthlyFlatRatePercent: input.interestRate,
      discountAmount: input.discountAmount,
    });
    const firstDue =
      input.firstDueDate || computeFirstDueDate(input.startDate);
    const schedule = buildFixedInstallmentSchedule(totals, firstDue);

    dbLoan = {
      id,
      loan_code: loanCode,
      loan_purpose: input.loanPurpose,
      repayment_method: input.repaymentMethod,
      customer_id: input.customerId,
      bike_id: input.bikeId,
      principal_amount: input.principalAmount,
      original_principal_amount: input.principalAmount,
      current_principal_balance: input.principalAmount,
      interest_rate: input.interestRate,
      interest_rate_period: 'MONTHLY',
      interest_calculation_type: 'FLAT_TERM',
      term_months: input.termMonths ?? 36,
      total_interest_amount: totals.totalInterest,
      total_before_discount: totals.totalBeforeDiscount,
      discount_amount: input.discountAmount,
      total_payable: totals.totalPayable,
      paid_amount: 0,
      balance_amount: totals.totalPayable,
      installment_amount: totals.monthlyInstallment,
      late_fee_rate: input.lateFeeRate,
      start_date: input.startDate,
      first_due_date: firstDue,
      due_date: firstDue,
      minimum_months_before_settlement: 6,
      status: 'ACTIVE',
      pending_interest_amount: 0,
      notes: input.notes,
      created_at: ts,
      updated_at: ts,
    };

    for (const line of schedule) {
      db.loan_installments.push({
        id: generateId(),
        loan_id: id,
        installment_number: line.installmentNumber,
        due_date: line.dueDate,
        principal_component: line.principalComponent,
        interest_component: line.interestComponent,
        installment_amount: line.installmentAmount,
        paid_amount: 0,
        late_fee_amount: 0,
        late_fee_paid: 0,
        status: 'PENDING',
        created_at: ts,
        updated_at: ts,
      });
    }

    if (isBike && input.bikeId) {
      const bike = db.bikes.find((b) => b.id === input.bikeId);
      if (bike) {
        bike.status = 'SOLD';
        bike.sold_date = ts;
        bike.sold_loan_id = id;
        bike.updated_at = ts;
      }
    }
  }

  db.loans.push(dbLoan);
  db.audit_logs.push({
    id: generateId(),
    user_id: db.profiles[0]?.id ?? 'system',
    action: 'CREATE',
    entity_type: 'loan',
    entity_id: id,
    summary: `Loan ${loanCode} created`,
    created_at: ts,
  });
  saveDb(db);
  return mapLoan(dbLoan);
}
