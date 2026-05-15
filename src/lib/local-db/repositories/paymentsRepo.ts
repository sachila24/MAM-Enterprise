import type { PaymentMethod } from '../../../types/loan';
import {
  allocateFixedInstallmentPayment,
  allocateInterestOnlyPaymentLines,
  type InstallmentForAllocation,
} from '../../finance/paymentAllocation';
import { calculateInstallmentLateFee } from '../../finance/fixedInstallmentStatus';
import { roundLKR } from '../../finance/money';
import { syncFixedInstallmentLateFees } from '../fixedInstallmentSync';
import { persistInterestOnlyCycles } from '../interestOnlySync';
import { buildPaymentBundle, resolveCurrentInstallmentNumber } from '../paymentBundle';
import { generateCode, generateId, getDb, saveDb } from '../localDb';
import { mapLegacyPayment, mapLoanPayment } from '../mappers';
import type { MamDemoDb } from '../types';
import type { LoanPayment } from '../../../types/entities';
import type { PaymentAllocationResult } from '../../finance/paymentAllocation';

export interface RecordPaymentInput {
  loanId: string;
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  notes?: string;
  chequeNumber?: string;
  bankReference?: string;
}

export interface RecordPaymentResult {
  payment: LoanPayment;
  receiptNumber: string;
  allocation: PaymentAllocationResult;
}

function methodToDb(m: PaymentMethod): 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'OTHER' {
  if (m === 'CHEQUE') return 'CHEQUE';
  if (m === 'BANK_TRANSFER') return 'BANK_TRANSFER';
  return 'CASH';
}

export function listPayments(db: MamDemoDb = getDb()) {
  return db.loan_payments.map(mapLegacyPayment);
}

export function listLoanPayments(db: MamDemoDb = getDb()) {
  return db.loan_payments.map(mapLoanPayment);
}

export function recordPayment(
  input: RecordPaymentInput,
  db: MamDemoDb = getDb()
): RecordPaymentResult {
  const loan = db.loans.find((l) => l.id === input.loanId);
  if (!loan) throw new Error('Loan not found');

  if (loan.repayment_method === 'INTEREST_ONLY_REDUCING_PRINCIPAL') {
    persistInterestOnlyCycles(db, input.loanId, input.paymentDate);
  }
  if (loan.repayment_method === 'FIXED_TERM_INSTALLMENT') {
    syncFixedInstallmentLateFees(db, input.loanId, input.paymentDate);
  }

  const ts = new Date().toISOString();
  const bundle = buildPaymentBundle(db);
  const isIO = loan.repayment_method === 'INTEREST_ONLY_REDUCING_PRINCIPAL';

  let allocation: PaymentAllocationResult;

  if (isIO) {
    const cycles = bundle.interestCyclesByLoanId[loan.id] ?? [];
    allocation = allocateInterestOnlyPaymentLines(
      {
        currentPrincipal: loan.current_principal_balance,
        monthlyInterestRatePercent: loan.interest_rate,
        cycles,
      },
      input.amount
    );
    applyInterestOnlyAllocation(db, loan.id, allocation, input.paymentDate, ts);
  } else {
    const installments: InstallmentForAllocation[] =
      bundle.installmentsByLoanId[loan.id] ?? [];
    const currentNum =
      bundle.currentInstallmentNumberByLoanId[loan.id] ??
      resolveCurrentInstallmentNumber(
        db.loan_installments.filter((i) => i.loan_id === loan.id),
        input.paymentDate
      );
    allocation = allocateFixedInstallmentPayment(
      {
        installments,
        paymentDate: input.paymentDate,
        lateFeeRatePercent: loan.late_fee_rate,
        currentInstallmentNumber: currentNum,
        loanBalanceAmount: loan.balance_amount,
      },
      input.amount
    );
    applyFixedAllocation(db, loan.id, allocation, input.paymentDate, ts);
  }

  const paymentId = generateId();
  const paymentCode = generateCode('PAY', db.counters);
  const receiptNumber = generateCode('RCP', db.counters);

  const paymentRow = {
    id: paymentId,
    payment_code: paymentCode,
    loan_id: loan.id,
    customer_id: input.customerId,
    amount: input.amount,
    payment_method: methodToDb(input.paymentMethod),
    cheque_number: input.chequeNumber,
    bank_reference: input.bankReference,
    payment_date: input.paymentDate,
    receipt_number: receiptNumber,
    notes: input.notes,
    status: 'CONFIRMED' as const,
    created_at: ts,
    updated_at: ts,
  };
  db.loan_payments.push(paymentRow);

  for (const line of allocation.allocations) {
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

  const updatedLoan = db.loans.find((l) => l.id === loan.id)!;
  db.receipts.push({
    id: generateId(),
    receipt_number: receiptNumber,
    payment_id: paymentId,
    loan_id: loan.id,
    customer_id: input.customerId,
    amount: input.amount,
    issued_at: input.paymentDate,
    breakdown: allocation.summary,
    created_at: ts,
  });

  db.audit_logs.push({
    id: generateId(),
    user_id: db.profiles[0]?.id ?? 'system',
    action: 'PAYMENT',
    entity_type: 'payment',
    entity_id: paymentId,
    summary: `Payment ${paymentCode} · ${receiptNumber} for ${updatedLoan.loan_code}`,
    created_at: ts,
  });

  saveDb(db);

  return {
    payment: mapLoanPayment(paymentRow),
    receiptNumber,
    allocation,
  };
}

function applyInterestOnlyAllocation(
  db: MamDemoDb,
  loanId: string,
  allocation: PaymentAllocationResult,
  paymentDate: string,
  ts: string
) {
  const loan = db.loans.find((l) => l.id === loanId)!;
  const cycles = db.loan_interest_cycles
    .filter((c) => c.loan_id === loanId)
    .sort((a, b) => a.cycle_number - b.cycle_number);

  for (const line of allocation.allocations) {
    if (line.allocationType === 'INTEREST' && line.interestCycleId) {
      const cycle = cycles.find((c) => c.id === line.interestCycleId);
      if (cycle) {
        cycle.interest_paid = roundLKR(cycle.interest_paid + line.amount);
        cycle.status =
          cycle.interest_paid >= cycle.interest_due ? 'PAID' : 'PARTIAL';
        cycle.updated_at = ts;
      }
    }
    if (line.allocationType === 'PRINCIPAL') {
      loan.current_principal_balance = roundLKR(
        loan.current_principal_balance - line.amount
      );
    }
  }

  loan.paid_amount = roundLKR(loan.paid_amount + allocation.totalAllocated);
  loan.balance_amount = loan.current_principal_balance;
  loan.pending_interest_amount =
    allocation.summary.pendingInterestRemaining ?? 0;

  if (loan.current_principal_balance <= 0) {
    loan.status = 'COMPLETED';
    loan.balance_amount = 0;
  }
  loan.updated_at = ts;

  persistInterestOnlyCycles(db, loanId, paymentDate);
}

function applyFixedAllocation(
  db: MamDemoDb,
  loanId: string,
  allocation: PaymentAllocationResult,
  paymentDate: string,
  ts: string
) {
  const loan = db.loans.find((l) => l.id === loanId)!;
  const installments = db.loan_installments.filter((i) => i.loan_id === loanId);

  for (const line of allocation.allocations) {
    if (!line.installmentId) continue;
    const inst = installments.find((i) => i.id === line.installmentId);
    if (!inst) continue;

    if (line.allocationType === 'LATE_FEE') {
      inst.late_fee_paid = roundLKR(inst.late_fee_paid + line.amount);
      const { lateFeeAmount } = calculateInstallmentLateFee(
        {
          installmentNumber: inst.installment_number,
          dueDate: inst.due_date,
          installmentAmount: inst.installment_amount,
          paidAmount: inst.paid_amount,
          lateFeeAmount: inst.late_fee_amount,
          lateFeePaid: inst.late_fee_paid,
        },
        loan.late_fee_rate,
        paymentDate
      );
      inst.late_fee_amount = lateFeeAmount;
    }
    if (line.allocationType === 'INSTALLMENT') {
      inst.paid_amount = roundLKR(inst.paid_amount + line.amount);
      if (inst.paid_amount >= inst.installment_amount) {
        inst.status = 'PAID';
        inst.paid_at = paymentDate;
      } else if (inst.paid_amount > 0) {
        inst.status = 'PARTIAL';
      }
    }
    inst.updated_at = ts;
  }

  const paidTowardDue = roundLKR(
    allocation.totalAllocated - (allocation.summary.advanceAmount ?? 0)
  );
  loan.paid_amount = roundLKR(loan.paid_amount + paidTowardDue);
  loan.balance_amount = roundLKR(
    Math.max(0, (loan.total_payable ?? loan.balance_amount) - loan.paid_amount)
  );

  const hasOverdue = installments.some(
    (i) =>
      i.paid_amount < i.installment_amount &&
      new Date(i.due_date) < new Date(paymentDate)
  );
  loan.status = hasOverdue ? 'OVERDUE' : 'ACTIVE';
  if (loan.balance_amount <= 0) loan.status = 'COMPLETED';
  loan.updated_at = ts;

  syncFixedInstallmentLateFees(db, loanId, paymentDate);
}
