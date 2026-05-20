import {
  buildFixedInstallmentSchedule,
  calculateFixedInstallmentTotals,
} from '../../finance/fixedInstallment';
import { calculateMonthlyInterestDue } from '../../finance/interestOnly';
import { computeFirstDueDate } from '../../finance/dueDates';
import type { Loan, LoanPurpose, RepaymentMethod } from '../../../types/loan';
import { persistInterestOnlyCycles } from '../interestOnlySync';
import { generateCode, generateId, getDb, saveDb } from '../localDb';
import { mapLoan } from '../mappers';
import { getLoanDetailFromDb } from '../loanDetail';
import type { DbGuarantee, DbLoan, MamDemoDb } from '../types';
import { buildAuditSummary, uiError } from '../../i18n/messages';
import { getSystemToday } from '../../time/systemTime';

export { getLoanDetailFromDb };

export interface CreateGuaranteeDraft {
  itemType: DbGuarantee['item_type'];
  itemReference?: string;
  ownerNameOnDocument?: string;
  description: string;
  storageLocation: string;
  receivedDate: string;
  notes?: string;
}

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
  /** Optional collateral items to store when the loan is created */
  guarantees?: CreateGuaranteeDraft[];
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

function pushGuaranteesForNewLoan(
  db: MamDemoDb,
  loanId: string,
  customerId: string,
  drafts: CreateGuaranteeDraft[] | undefined,
  ts: string
) {
  for (const g of drafts ?? []) {
    db.guarantees.push({
      id: generateId(),
      guarantee_code: generateCode('GUA', db.counters),
      loan_id: loanId,
      customer_id: customerId,
      item_type: g.itemType,
      item_reference: g.itemReference,
      owner_name_on_document: g.ownerNameOnDocument,
      description: g.description,
      storage_location: g.storageLocation,
      notes: g.notes,
      status: 'HELD',
      received_at: g.receivedDate.includes('T')
        ? g.receivedDate
        : `${g.receivedDate}T12:00:00.000Z`,
      created_at: ts,
    });
  }
}

export function createLoan(
  input: CreateLoanInput,
  db: MamDemoDb = getDb()
): Loan {
  const ts = new Date().toISOString();
  const id = generateId();
  const isBike = input.loanPurpose === 'BIKE_INSTALLMENT';
  if (isBike && input.repaymentMethod !== 'FIXED_TERM_INSTALLMENT') {
    throw new Error(uiError('bikeInstallmentMustFixedTerm'));
  }
  if (isBike && !input.bikeId) {
    throw new Error(uiError('selectInStockBikeInstallment'));
  }
  if (isBike && input.bikeId) {
    const bike = db.bikes.find((b) => b.id === input.bikeId);
    if (!bike) throw new Error(uiError('selectedBikeNotFound'));
    if (bike.status !== 'IN_STOCK') {
      throw new Error(uiError('selectedBikeNotInStock'));
    }
  }
  if (!input.customerId) {
    throw new Error(uiError('customerRequired'));
  }
  if (input.principalAmount <= 0) {
    throw new Error(uiError('financeAmountGreaterThanZero'));
  }
  const isInterestOnly =
    input.repaymentMethod === 'INTEREST_ONLY_REDUCING_PRINCIPAL';
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

  if (isInterestOnly) {
    persistInterestOnlyCycles(db, id, getSystemToday());
  }

  pushGuaranteesForNewLoan(db, id, input.customerId, input.guarantees, ts);

  db.audit_logs.push({
    id: generateId(),
    user_id: db.profiles[0]?.id ?? 'system',
    action: 'CREATE',
    entity_type: 'loan',
    entity_id: id,
    summary: buildAuditSummary('loanCreatedSummary', { code: loanCode }),
    created_at: ts,
  });
  saveDb(db);
  return mapLoan(dbLoan);
}

/** Link an existing bike installment loan row to inventory (manual sale flow). */
export function attachBikeToLoan(
  loanId: string,
  bikeId: string,
  db: MamDemoDb = getDb()
): Loan | undefined {
  const row = db.loans.find((l) => l.id === loanId);
  if (!row) return undefined;
  row.bike_id = bikeId;
  row.updated_at = new Date().toISOString();
  saveDb(db);
  return mapLoan(row);
}
