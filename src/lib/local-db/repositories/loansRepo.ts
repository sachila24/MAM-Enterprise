import {
  buildFixedInstallmentSchedule,
  calculateFixedInstallmentTotals,
} from '../../finance/fixedInstallment';
import { calculateMonthlyInterestDue } from '../../finance/interestOnly';
import {
  addMonthsSameDay,
  computeFirstDueDate,
  deriveDueDay,
  interestCyclePeriodBounds,
} from '../../finance/dueDates';
import { splitAllocationsCashAndDiscount } from '../../finance/paymentDiscountSplit';
import { roundLKR } from '../../finance/money';
import type { Loan, LoanPurpose, RepaymentMethod } from '../../../types/loan';
import { persistInterestOnlyCycles } from '../interestOnlySync';
import { generateCode, generateId, getDb, saveDb } from '../localDb';
import { mapLoan } from '../mappers';
import { getLoanDetailFromDb } from '../loanDetail';
import { syncFixedInstallmentLateFees } from '../fixedInstallmentSync';
import type { DbGuarantee, DbLoan, MamDemoDb } from '../types';

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

export type LoanEntryMode = 'NEW' | 'FROM_BOOKS';

export interface FromBooksFixedPayload {
  openingDate: string;
  completedInstallments: number;
  nextDueDate: string;
  openingArrearsAmount?: number;
  openingLateFeeAmount?: number;
  amountPaidBeforeSystem?: number;
  importedNotes?: string;
}

export interface FromBooksIOPayload {
  openingDate: string;
  originalPrincipal: number;
  currentPrincipal: number;
  pendingInterestCarried: number;
  nextInterestDueDate: string;
  originalBookStartDate?: string;
  importedNotes?: string;
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
  entryMode?: LoanEntryMode;
  fromBooksFixed?: FromBooksFixedPayload;
  fromBooksIO?: FromBooksIOPayload;
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

export function syncFixedLoanAggregatesFromSchedule(
  db: MamDemoDb,
  loanId: string
): void {
  const loan = db.loans.find((l) => l.id === loanId);
  if (!loan || loan.repayment_method !== 'FIXED_TERM_INSTALLMENT') return;
  const insts = db.loan_installments
    .filter((i) => i.loan_id === loanId)
    .sort((a, b) => a.installment_number - b.installment_number);
  let bal = 0;
  for (const i of insts) {
    const instRem = roundLKR(Math.max(0, i.installment_amount - i.paid_amount));
    const lateRem = roundLKR(Math.max(0, i.late_fee_amount - i.late_fee_paid));
    bal = roundLKR(bal + instRem + lateRem);
  }
  const tp = loan.total_payable ?? 0;
  loan.balance_amount = bal;
  loan.paid_amount = roundLKR(Math.max(0, tp - bal));
  const allPaid =
    insts.length > 0 &&
    insts.every((i) => i.paid_amount >= i.installment_amount);
  if (bal <= 0 && allPaid) {
    loan.status = 'COMPLETED';
  } else if (loan.status === 'COMPLETED' && bal > 0) {
    loan.status = 'ACTIVE';
  }
  loan.updated_at = new Date().toISOString();
}

function applyFromBooksFixedImport(
  db: MamDemoDb,
  loanId: string,
  payload: FromBooksFixedPayload,
  originalContractStartDate: string,
  ts: string
): void {
  const loan = db.loans.find((l) => l.id === loanId);
  if (!loan) return;
  const insts = db.loan_installments
    .filter((i) => i.loan_id === loanId)
    .sort((a, b) => a.installment_number - b.installment_number);

  loan.is_imported = true;
  loan.opening_date = payload.openingDate;
  loan.original_book_start_date = originalContractStartDate;
  loan.completed_installments_at_import = payload.completedInstallments;
  if (payload.amountPaidBeforeSystem !== undefined) {
    loan.opening_paid_before_system = roundLKR(payload.amountPaidBeforeSystem);
  }
  if (payload.openingArrearsAmount !== undefined) {
    loan.opening_arrears_at_import = roundLKR(payload.openingArrearsAmount);
  }
  if (payload.openingLateFeeAmount !== undefined) {
    loan.opening_late_fee_at_import = roundLKR(payload.openingLateFeeAmount);
  }
  if (payload.importedNotes) {
    loan.imported_notes = payload.importedNotes;
  }

  const K = Math.min(
    Math.max(0, Math.floor(payload.completedInstallments)),
    insts.length
  );
  for (let idx = 0; idx < K; idx++) {
    const row = insts[idx];
    row.paid_amount = row.installment_amount;
    row.late_fee_amount = 0;
    row.late_fee_paid = 0;
    row.status = 'PAID';
    row.paid_at = payload.openingDate;
    row.updated_at = ts;
  }

  const target =
    insts.find(
      (i) =>
        i.due_date === payload.nextDueDate &&
        i.installment_number > (insts[K - 1]?.installment_number ?? 0)
    ) ?? insts[K];

  if (target) {
    if ((payload.openingArrearsAmount ?? 0) > 0) {
      const arr = roundLKR(payload.openingArrearsAmount ?? 0);
      target.paid_amount = roundLKR(Math.max(0, target.installment_amount - arr));
      target.status =
        target.paid_amount >= target.installment_amount
          ? 'PAID'
          : target.paid_amount > 0
            ? 'PARTIAL'
            : 'PENDING';
    }
    if ((payload.openingLateFeeAmount ?? 0) > 0) {
      target.late_fee_amount = roundLKR(payload.openingLateFeeAmount ?? 0);
      target.late_fee_paid = 0;
    }
    target.updated_at = ts;
  }

  syncFixedLoanAggregatesFromSchedule(db, loanId);
  loan.opening_balance_at_import = loan.balance_amount;
  syncFixedInstallmentLateFees(db, loanId, payload.openingDate);
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
    throw new Error('Bike installment loans must use fixed-term installments.');
  }
  if (isBike && !input.bikeId) {
    throw new Error('Select an in-stock bike for this installment loan.');
  }
  if (isBike && input.bikeId) {
    const bike = db.bikes.find((b) => b.id === input.bikeId);
    if (!bike) throw new Error('Selected bike not found.');
    if (bike.status !== 'IN_STOCK') {
      throw new Error('Selected bike is no longer in stock.');
    }
  }
  if (!input.customerId) {
    throw new Error('Customer is required.');
  }
  const skipPrincipalCheck =
    input.entryMode === 'FROM_BOOKS' && !!input.fromBooksIO;
  if (!skipPrincipalCheck && input.principalAmount <= 0) {
    throw new Error('Finance amount must be greater than zero.');
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
    if (input.entryMode === 'FROM_BOOKS' && input.fromBooksIO) {
      const p = input.fromBooksIO;
      if (p.currentPrincipal <= 0) {
        throw new Error('Enter the current principal balance from the old book.');
      }
      if (p.originalPrincipal <= 0) {
        throw new Error('Enter the original principal amount.');
      }
      const scheduleStart = addMonthsSameDay(p.nextInterestDueDate, -1);
      const bounds = interestCyclePeriodBounds(scheduleStart, 1);
      const principalPaidBefore = roundLKR(
        Math.max(0, p.originalPrincipal - p.currentPrincipal)
      );

      dbLoan = {
        id,
        loan_code: loanCode,
        loan_purpose: input.loanPurpose,
        repayment_method: input.repaymentMethod,
        customer_id: input.customerId,
        bike_id: input.bikeId,
        principal_amount: p.originalPrincipal,
        original_principal_amount: p.originalPrincipal,
        current_principal_balance: p.currentPrincipal,
        interest_rate: input.interestRate,
        interest_rate_period: 'MONTHLY',
        interest_calculation_type: 'REDUCING_PRINCIPAL',
        discount_amount: input.discountAmount,
        paid_amount: principalPaidBefore,
        balance_amount: p.currentPrincipal,
        late_fee_rate: 0,
        start_date: scheduleStart,
        first_due_date: p.nextInterestDueDate,
        due_day: input.dueDay ?? deriveDueDay(p.openingDate),
        due_date: p.nextInterestDueDate,
        minimum_months_before_settlement: 6,
        status: 'ACTIVE',
        pending_interest_amount: roundLKR(p.pendingInterestCarried),
        is_imported: true,
        opening_date: p.openingDate,
        original_book_start_date: p.originalBookStartDate ?? p.openingDate,
        imported_notes: p.importedNotes,
        opening_balance_at_import: p.currentPrincipal,
        notes: input.notes,
        created_at: ts,
        updated_at: ts,
      };

      db.loans.push(dbLoan);

      db.loan_interest_cycles.push({
        id: generateId(),
        loan_id: id,
        cycle_number: 1,
        period_start: p.openingDate,
        period_end: bounds.periodEnd,
        due_date: p.nextInterestDueDate,
        opening_principal: p.currentPrincipal,
        interest_rate: input.interestRate,
        interest_due: roundLKR(p.pendingInterestCarried),
        interest_paid: 0,
        principal_paid: 0,
        closing_principal: p.currentPrincipal,
        status: 'PENDING',
        created_at: ts,
        updated_at: ts,
      });

      persistInterestOnlyCycles(db, id, p.openingDate);
    } else {
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

      db.loans.push(dbLoan);
      persistInterestOnlyCycles(
        db,
        id,
        new Date().toISOString().split('T')[0]
      );
    }
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

    db.loans.push(dbLoan);

    if (input.entryMode === 'FROM_BOOKS' && input.fromBooksFixed) {
      applyFromBooksFixedImport(
        db,
        id,
        input.fromBooksFixed,
        input.startDate,
        ts
      );
    }
  }

  pushGuaranteesForNewLoan(db, id, input.customerId, input.guarantees, ts);

  db.audit_logs.push({
    id: generateId(),
    user_id: db.profiles[0]?.id ?? 'system',
    action: 'CREATE',
    entity_type: 'loan',
    entity_id: id,
    summary: `Loan ${loanCode} created`,
    created_at: ts,
  });

  if (input.entryMode === 'FROM_BOOKS' && input.fromBooksFixed) {
    db.audit_logs.push({
      id: generateId(),
      user_id: db.profiles[0]?.id ?? 'system',
      action: 'IMPORT',
      entity_type: 'loan',
      entity_id: id,
      summary: `Opening balance imported from old book · ${loanCode}`,
      created_at: ts,
    });
  }
  if (input.entryMode === 'FROM_BOOKS' && input.fromBooksIO) {
    db.audit_logs.push({
      id: generateId(),
      user_id: db.profiles[0]?.id ?? 'system',
      action: 'IMPORT',
      entity_type: 'loan',
      entity_id: id,
      summary: `Interest-only loan opened from old book · ${loanCode}`,
      created_at: ts,
    });
  }

  saveDb(db);
  return mapLoan(dbLoan);
}

export interface RecordEarlySettlementInput {
  loanId: string;
  customerId: string;
  settlementDate: string;
  cashReceived: number;
  discountAmount: number;
  notes?: string;
}

export function recordEarlySettlement(
  input: RecordEarlySettlementInput,
  db: MamDemoDb = getDb()
): { paymentId: string; receiptNumber: string } {
  const loan = db.loans.find((l) => l.id === input.loanId);
  if (!loan || loan.repayment_method !== 'FIXED_TERM_INSTALLMENT') {
    throw new Error('Early settlement applies to fixed installment loans only.');
  }
  const paidInst = db.loan_installments.filter(
    (i) => i.loan_id === loan.id && i.status === 'PAID'
  ).length;
  if (paidInst < loan.minimum_months_before_settlement) {
    throw new Error(
      `Early settlement is allowed after ${loan.minimum_months_before_settlement} completed installments.`
    );
  }

  const balanceBefore = roundLKR(loan.balance_amount);
  if (balanceBefore <= 0) {
    throw new Error('This loan has no remaining balance to settle.');
  }

  const apply = roundLKR(input.cashReceived + input.discountAmount);
  if (Math.abs(apply - balanceBefore) > 1) {
    throw new Error(
      `Settlement total (${apply.toLocaleString()} LKR) must match the loan balance (${balanceBefore.toLocaleString()} LKR). Adjust cash or discount.`
    );
  }

  const ts = new Date().toISOString();
  const insts = db.loan_installments.filter((i) => i.loan_id === loan.id);
  for (const i of insts) {
    i.paid_amount = i.installment_amount;
    i.late_fee_paid = roundLKR(Math.max(i.late_fee_paid, i.late_fee_amount));
    i.late_fee_amount = i.late_fee_paid;
    i.status = 'PAID';
    i.paid_at = input.settlementDate;
    i.updated_at = ts;
  }

  const tp = loan.total_payable ?? 0;
  loan.paid_amount = tp > 0 ? tp : roundLKR(loan.paid_amount + balanceBefore);
  loan.balance_amount = 0;
  loan.status = 'COMPLETED';
  loan.updated_at = ts;

  const paymentId = generateId();
  const paymentCode = generateCode('PAY', db.counters);
  const receiptNumber = generateCode('RCP', db.counters);
  const cash = roundLKR(input.cashReceived);
  const discount = roundLKR(input.discountAmount ?? 0);

  db.loan_payments.push({
    id: paymentId,
    payment_code: paymentCode,
    loan_id: loan.id,
    customer_id: input.customerId,
    amount: cash,
    discount_amount: discount,
    applied_amount: balanceBefore,
    payment_method: 'CASH',
    payment_date: input.settlementDate,
    receipt_number: receiptNumber,
    notes: input.notes ?? 'Early settlement',
    status: 'CONFIRMED',
    created_at: ts,
    updated_at: ts,
  });

  const allocLines = splitAllocationsCashAndDiscount(
    [{ allocationType: 'SETTLEMENT', amount: balanceBefore }],
    cash,
    discount
  );

  for (const line of allocLines) {
    if (line.amount <= 0) continue;
    db.payment_allocations.push({
      id: generateId(),
      payment_id: paymentId,
      loan_id: loan.id,
      allocation_type: line.allocationType,
      installment_id: line.installmentId,
      interest_cycle_id: line.interestCycleId,
      amount: line.amount,
      created_at: ts,
    });
  }

  db.receipts.push({
    id: generateId(),
    receipt_number: receiptNumber,
    payment_id: paymentId,
    loan_id: loan.id,
    customer_id: input.customerId,
    amount: cash,
    issued_at: input.settlementDate,
    breakdown: {
      kind: 'EARLY_SETTLEMENT',
      cashReceived: cash,
      discountGiven: discount,
      totalApplied: balanceBefore,
    },
    created_at: ts,
  });

  db.early_settlements.push({
    id: generateId(),
    settlement_code: generateCode('SET', db.counters),
    loan_id: loan.id,
    customer_id: input.customerId,
    settlement_date: input.settlementDate,
    months_completed: paidInst,
    remaining_principal: 0,
    remaining_interest: 0,
    discount_percentage: 0,
    discount_amount: discount,
    current_month_due: 0,
    final_settlement_amount: balanceBefore,
    status: 'PAID',
    created_at: ts,
  });

  db.audit_logs.push({
    id: generateId(),
    user_id: db.profiles[0]?.id ?? 'system',
    action: 'SETTLEMENT',
    entity_type: 'loan',
    entity_id: loan.id,
    summary: `Early settlement ${receiptNumber} · ${loan.loan_code}`,
    created_at: ts,
  });

  saveDb(db);
  return { paymentId, receiptNumber };
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
