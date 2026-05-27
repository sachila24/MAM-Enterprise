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
import {
  createLoanCreationDocument,
  createLoanReleaseDocument,
} from '../../documents/documentService';
import {
  computeOriginationFees,
  validateOriginationFees,
} from '../../finance/loanOriginationFees';
import { createCashTransaction } from './cashTransactionsRepo';

export { getLoanDetailFromDb };

export interface CreateGuaranteeDraft {
  fileNumber?: string;
  vehicleNumber?: string;
  guarantor1Name?: string;
  guarantor1Address?: string;
  guarantor1Phone?: string;
  guarantor1Nic?: string;
  guarantor2Name?: string;
  guarantor2Address?: string;
  guarantor2Phone?: string;
  guarantor2Nic?: string;
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
  /** Bike installment — stored on locked finance invoice snapshot */
  downPayment?: number;
  initialPayment?: number;
  serviceFee?: number;
  registrationFee?: number;
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
      item_type: 'OTHER',
      file_number: g.fileNumber,
      vehicle_number: g.vehicleNumber,
      guarantor1_name: g.guarantor1Name,
      guarantor1_address: g.guarantor1Address,
      guarantor1_phone: g.guarantor1Phone,
      guarantor1_nic: g.guarantor1Nic,
      guarantor2_name: g.guarantor2Name,
      guarantor2_address: g.guarantor2Address,
      guarantor2_phone: g.guarantor2Phone,
      guarantor2_nic: g.guarantor2Nic,
      description: '',
      storage_location: '',
      status: 'HELD',
      received_at: ts,
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

  const grossLoanAmount = input.principalAmount;
  const origination = computeOriginationFees(
    {
      initialPayment: input.initialPayment ?? 0,
      serviceFee: input.serviceFee ?? 0,
      registrationFee: input.registrationFee ?? 0,
    },
    grossLoanAmount
  );
  const feeError = validateOriginationFees(
    {
      initialPayment: origination.initialPayment,
      serviceFee: origination.serviceFee,
      registrationFee: origination.registrationFee,
    },
    grossLoanAmount
  );
  if (feeError) {
    throw new Error(uiError(feeError as Parameters<typeof uiError>[0]));
  }

  const isInterestOnly =
    input.repaymentMethod === 'INTEREST_ONLY_REDUCING_PRINCIPAL';
  const loanCode = nextLoanCode(
    input.loanPurpose,
    input.repaymentMethod,
    db.counters
  );

  let dbLoan: DbLoan;

  const feeFields = {
    service_fee: origination.serviceFee,
    registration_fee: origination.registrationFee,
    customer_paid_amount: origination.initialPayment,
    advance_payment: origination.netAdvancePayment,
  };

  if (isInterestOnly) {
    const financedPrincipal = origination.financedPrincipal;
    const monthlyInterest = calculateMonthlyInterestDue(
      financedPrincipal,
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
      principal_amount: financedPrincipal,
      original_principal_amount: grossLoanAmount,
      current_principal_balance: financedPrincipal,
      interest_rate: input.interestRate,
      interest_rate_period: 'MONTHLY',
      interest_calculation_type: 'REDUCING_PRINCIPAL',
      discount_amount: input.discountAmount,
      paid_amount: 0,
      balance_amount: financedPrincipal,
      late_fee_rate: 0,
      start_date: input.startDate,
      first_due_date: firstDue,
      due_day: input.dueDay ?? 15,
      due_date: firstDue,
      minimum_months_before_settlement: 6,
      status: 'ACTIVE',
      pending_interest_amount: monthlyInterest,
      notes: input.notes,
      ...feeFields,
      created_at: ts,
      updated_at: ts,
    };

  } else {
    const financedPrincipal = origination.financedPrincipal;
    const totals = calculateFixedInstallmentTotals({
      financeAmount: financedPrincipal,
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
      principal_amount: financedPrincipal,
      original_principal_amount: grossLoanAmount,
      current_principal_balance: financedPrincipal,
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
      ...feeFields,
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

  const txnDate = input.startDate;
  if (origination.netAdvancePayment > 0) {
    createCashTransaction(
      {
        loanId: id,
        customerId: input.customerId,
        transactionType: 'LOAN_ADVANCE_PAYMENT',
        amount: origination.netAdvancePayment,
        transactionDate: txnDate,
        notes: `Loan advance — ${loanCode}`,
      },
      db
    );
  }
  if (origination.serviceFee > 0) {
    createCashTransaction(
      {
        loanId: id,
        customerId: input.customerId,
        transactionType: 'SERVICE_FEE_INCOME',
        amount: origination.serviceFee,
        transactionDate: txnDate,
        notes: `Service fee — ${loanCode}`,
      },
      db
    );
  }
  if (origination.registrationFee > 0) {
    createCashTransaction(
      {
        loanId: id,
        customerId: input.customerId,
        transactionType: 'REGISTRATION_FEE_INCOME',
        amount: origination.registrationFee,
        transactionDate: txnDate,
        notes: `Registration fee — ${loanCode}`,
      },
      db
    );
  }

  db.audit_logs.push({
    id: generateId(),
    user_id: db.profiles[0]?.id ?? 'system',
    action: 'CREATE',
    entity_type: 'loan',
    entity_id: id,
    summary: buildAuditSummary('loanCreatedSummary', { code: loanCode }),
    created_at: ts,
  });

  createLoanCreationDocument(db, id, {
    downPayment: input.downPayment,
    createdBy: db.profiles[0]?.id,
  });

  if (isInterestOnly) {
    createLoanReleaseDocument(db, id, {
      createdBy: db.profiles[0]?.id,
    });
  }

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
