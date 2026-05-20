import type { PaymentMethod } from '../../../types/loan';
import {
  allocateFixedInstallmentPayment,
  allocateInterestOnlyPaymentLines,
  summarizeFixedInstallmentDue,
  summarizeFixedInstallmentPaid,
  type InstallmentForAllocation,
} from '../../finance/paymentAllocation';
import { runLateFeeEngine } from '../../finance/fixedInstallmentStatus';
import { getLateFeeLineByInstallmentId } from '../../finance/lateFeeEngineV3';
import { roundLKR } from '../../finance/money';
import {
  splitAllocationsCashAndDiscount,
  summarizeLinesForFixedPayment,
  summarizeLinesForInterestOnlyPayment,
} from '../../finance/paymentDiscountSplit';
import {
  buildFixedInstallmentReceipt,
  buildInterestOnlyReceipt,
} from '../../finance/receipt';
import { syncFixedInstallmentLateFees } from '../fixedInstallmentSync';
import { persistInterestOnlyCycles } from '../interestOnlySync';
import { buildPaymentBundle, resolveCurrentInstallmentNumber } from '../paymentBundle';
import { generateCode, generateId, getDb, saveDb } from '../localDb';
import { mapLegacyPayment, mapLoanPayment } from '../mappers';
import type { MamDemoDb } from '../types';
import type { LoanPayment } from '../../../types/entities';
import { buildAuditSummary, uiError } from '../../i18n/messages';
import type { PaymentAllocationResult } from '../../finance/paymentAllocation';
import { getSystemTimestamp, isDateBefore } from '../../time/systemTime';

export interface RecordPaymentInput {
  loanId: string;
  customerId: string;
  amount: number;
  /** Owner waiver / discount — applied with cash using the same allocation rules */
  discountAmount?: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  notes?: string;
  chequeNumber?: string;
  bankReference?: string;
  /** Generated once per confirm — prevents duplicate rows on rapid clicks */
  clientSubmitId?: string;
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

function sumAllocationAmounts(lines: PaymentAllocationResult['allocations']): number {
  return roundLKR(lines.reduce((s, l) => s + l.amount, 0));
}

function findPaymentBySubmitId(
  db: MamDemoDb,
  clientSubmitId: string
): DbLoanPayment | undefined {
  return db.loan_payments.find(
    (p) => p.client_submit_id === clientSubmitId && p.status === 'CONFIRMED'
  );
}

type DbLoanPayment = MamDemoDb['loan_payments'][number];

const inFlightPaymentSubmits = new Set<string>();

function rebuildAllocationFromPayment(
  db: MamDemoDb,
  paymentId: string
): PaymentAllocationResult {
  const lines = db.payment_allocations.filter((a) => a.payment_id === paymentId);
  const totalAllocated = roundLKR(lines.reduce((s, l) => s + l.amount, 0));
  const receipt = db.receipts.find((r) => r.payment_id === paymentId);
  const breakdown = receipt?.breakdown as
    | PaymentAllocationResult['summary']
    | undefined;
  const summary: PaymentAllocationResult['summary'] = {
    lateFeesPaid: breakdown?.lateFeesPaid ?? 0,
    installmentsPaid: breakdown?.installmentsPaid ?? 0,
    currentMonthPaid: breakdown?.currentMonthPaid ?? 0,
    advanceAmount: breakdown?.advanceAmount ?? 0,
    interestPaid: breakdown?.interestPaid,
    principalPaid: breakdown?.principalPaid,
    newPrincipal: breakdown?.newPrincipal,
    pendingInterestRemaining: breakdown?.pendingInterestRemaining,
    nextEstimatedInterest: breakdown?.nextEstimatedInterest,
    totalDueBeforePayment: breakdown?.totalDueBeforePayment,
    arrearsRemainingAfter: breakdown?.arrearsRemainingAfter,
    loanBalanceAfter: breakdown?.loanBalanceAfter,
  };
  return {
    allocations: lines.map((l) => ({
      allocationType: l.allocation_type,
      amount: l.amount,
      installmentId: l.installment_id,
      interestCycleId: l.interest_cycle_id,
    })),
    summary,
    totalAllocated,
    unallocated: 0,
  };
}

export function recordPayment(
  input: RecordPaymentInput,
  db: MamDemoDb = getDb()
): RecordPaymentResult {
  if (input.clientSubmitId) {
    const existing = findPaymentBySubmitId(db, input.clientSubmitId);
    if (existing) {
      return {
        payment: mapLoanPayment(existing),
        receiptNumber: existing.receipt_number,
        allocation: rebuildAllocationFromPayment(db, existing.id),
      };
    }
    if (inFlightPaymentSubmits.has(input.clientSubmitId)) {
      throw new Error(uiError('paymentSaveInProgress'));
    }
    inFlightPaymentSubmits.add(input.clientSubmitId);
  }

  try {
  const loan = db.loans.find((l) => l.id === input.loanId);
  if (!loan) throw new Error(uiError('loanNotFound'));

  if (loan.repayment_method === 'INTEREST_ONLY_REDUCING_PRINCIPAL') {
    persistInterestOnlyCycles(db, input.loanId, input.paymentDate);
  }
  if (loan.repayment_method === 'FIXED_TERM_INSTALLMENT') {
    syncFixedInstallmentLateFees(db, input.loanId, input.paymentDate);
  }

  const ts = getSystemTimestamp();
  const bundle = buildPaymentBundle(db);
  const isIO = loan.repayment_method === 'INTEREST_ONLY_REDUCING_PRINCIPAL';
  const cashAmount = roundLKR(input.amount);
  const discountAmount = roundLKR(input.discountAmount ?? 0);
  const totalApply = roundLKR(cashAmount + discountAmount);
  if (totalApply <= 0) {
    throw new Error(uiError('enterPaymentAmount'));
  }

  const balanceBefore = isIO
    ? loan.current_principal_balance
    : loan.balance_amount;

  let allocation: PaymentAllocationResult;
  let installments: InstallmentForAllocation[] = [];
  let currentNum = 1;
  let fixedDueBeforeTotal = 0;

  if (isIO) {
    const cycles = bundle.interestCyclesByLoanId[loan.id] ?? [];
    allocation = allocateInterestOnlyPaymentLines(
      {
        currentPrincipal: loan.current_principal_balance,
        monthlyInterestRatePercent: loan.interest_rate,
        cycles,
      },
      totalApply
    );
  } else {
    installments = bundle.installmentsByLoanId[loan.id] ?? [];
    currentNum =
      bundle.currentInstallmentNumberByLoanId[loan.id] ??
      resolveCurrentInstallmentNumber(
        db.loan_installments.filter((i) => i.loan_id === loan.id),
        input.paymentDate
      );
    fixedDueBeforeTotal = summarizeFixedInstallmentDue(
      {
        installments,
        paymentDate: input.paymentDate,
        lateFeeRatePercent: loan.late_fee_rate,
        monthlyInstallmentAmount: loan.installment_amount,
        currentInstallmentNumber: currentNum,
      },
      input.paymentDate
    ).totalDue;
    allocation = allocateFixedInstallmentPayment(
      {
        installments,
        paymentDate: input.paymentDate,
        lateFeeRatePercent: loan.late_fee_rate,
        monthlyInstallmentAmount: loan.installment_amount,
        currentInstallmentNumber: currentNum,
        loanBalanceAmount: loan.balance_amount,
      },
      totalApply
    );
  }

  const finalLines = splitAllocationsCashAndDiscount(
    allocation.allocations,
    cashAmount,
    discountAmount
  );
  const totalAllocated = sumAllocationAmounts(finalLines);
  const summary = isIO
    ? summarizeLinesForInterestOnlyPayment(finalLines, allocation.summary)
    : summarizeLinesForFixedPayment(finalLines, currentNum, allocation.summary);

  const merged: PaymentAllocationResult = {
    ...allocation,
    allocations: finalLines,
    summary,
    totalAllocated,
    unallocated: roundLKR(totalApply - totalAllocated),
  };

  if (merged.unallocated > 0) {
    throw new Error(
      uiError('paymentUnallocated', {
        amount: merged.unallocated.toLocaleString(),
      })
    );
  }

  if (isIO) {
    applyInterestOnlyAllocation(db, loan.id, merged, input.paymentDate, ts);
  } else {
    applyFixedAllocation(db, loan.id, merged, input.paymentDate, ts);
  }

  const paymentId = generateId();
  const paymentCode = generateCode('PAY', db.counters);
  const receiptNumber = generateCode('RCP', db.counters);

  const paymentRow = {
    id: paymentId,
    payment_code: paymentCode,
    loan_id: loan.id,
    customer_id: input.customerId,
    amount: cashAmount,
    discount_amount: discountAmount,
    applied_amount: totalApply,
    payment_method: methodToDb(input.paymentMethod),
    cheque_number: input.chequeNumber,
    bank_reference: input.bankReference,
    payment_date: input.paymentDate,
    receipt_number: receiptNumber,
    client_submit_id: input.clientSubmitId,
    notes: input.notes,
    status: 'CONFIRMED' as const,
    created_at: ts,
    updated_at: ts,
  };
  db.loan_payments.push(paymentRow);

  for (const line of merged.allocations) {
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
  const receiptBreakdown = isIO
    ? buildInterestOnlyReceipt(
        merged,
        loan.interest_rate,
        balanceBefore,
        cashAmount,
        discountAmount
      )
    : buildFixedInstallmentReceipt(
        merged,
        balanceBefore,
        fixedDueBeforeTotal,
        cashAmount,
        discountAmount,
        {
          monthlyInstallment: loan.installment_amount,
          lateFeeRate: loan.late_fee_rate,
          paymentDate: input.paymentDate,
          schedule: installments.map((i) => ({
            id: i.id,
            installmentNumber: i.installmentNumber,
            dueDate: i.dueDate,
            installmentAmount: i.installmentAmount,
            paidAmount: i.paidAmount,
            lateFeePaid: i.lateFeePaid,
          })),
        }
      );

  db.receipts.push({
    id: generateId(),
    receipt_number: receiptNumber,
    payment_id: paymentId,
    loan_id: loan.id,
    customer_id: input.customerId,
    amount: cashAmount,
    issued_at: input.paymentDate,
    breakdown: { ...merged.summary, receipt: receiptBreakdown },
    created_at: ts,
  });

  db.audit_logs.push({
    id: generateId(),
    user_id: db.profiles[0]?.id ?? 'system',
    action: 'PAYMENT',
    entity_type: 'payment',
    entity_id: paymentId,
    summary: buildAuditSummary('paymentAuditSummary', {
      code: paymentCode,
      receipt: receiptNumber,
      loanCode: updatedLoan.loan_code,
    }),
    created_at: ts,
  });

  saveDb(db);

  return {
    payment: mapLoanPayment(paymentRow),
    receiptNumber,
    allocation: merged,
  };
  } finally {
    if (input.clientSubmitId) {
      inFlightPaymentSubmits.delete(input.clientSubmitId);
    }
  }
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
    if (
      (line.allocationType === 'INTEREST' ||
        line.allocationType === 'INTEREST_DISCOUNT') &&
      line.interestCycleId
    ) {
      const cycle = cycles.find((c) => c.id === line.interestCycleId);
      if (cycle) {
        cycle.interest_paid = roundLKR(cycle.interest_paid + line.amount);
        cycle.status =
          cycle.interest_paid >= cycle.interest_due ? 'PAID' : 'PARTIAL';
        cycle.updated_at = ts;
      }
    }
    if (
      line.allocationType === 'PRINCIPAL' ||
      line.allocationType === 'PRINCIPAL_DISCOUNT'
    ) {
      loan.current_principal_balance = roundLKR(
        loan.current_principal_balance - line.amount
      );
    }
  }

  const paidTowardLoan = roundLKR(
    allocation.totalAllocated - (allocation.summary.advanceAmount ?? 0)
  );
  loan.paid_amount = roundLKR(loan.paid_amount + paidTowardLoan);
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

  const refreshLateFeeAmounts = () => {
    const engine = runLateFeeEngine(
      installments.map((inst) => ({
        id: inst.id,
        installmentNumber: inst.installment_number,
        dueDate: inst.due_date,
        installmentAmount: inst.installment_amount,
        paidAmount: inst.paid_amount,
        lateFeeAmount: inst.late_fee_amount,
        lateFeePaid: inst.late_fee_paid,
      })),
      loan.installment_amount,
      loan.late_fee_rate,
      { paymentDate }
    );
    for (const inst of installments) {
      const line = getLateFeeLineByInstallmentId(engine, inst.id);
      inst.late_fee_amount = line?.lateFee ?? 0;
    }
  };

  for (const line of allocation.allocations) {
    if (!line.installmentId) continue;
    const inst = installments.find((i) => i.id === line.installmentId);
    if (!inst) continue;

    if (
      line.allocationType === 'LATE_FEE' ||
      line.allocationType === 'LATE_FEE_DISCOUNT'
    ) {
      inst.late_fee_paid = roundLKR(inst.late_fee_paid + line.amount);
      refreshLateFeeAmounts();
    }
    if (
      line.allocationType === 'INSTALLMENT' ||
      line.allocationType === 'INSTALLMENT_DISCOUNT'
    ) {
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

  const { installmentPaid } = summarizeFixedInstallmentPaid(allocation.summary);
  loan.paid_amount = roundLKR(loan.paid_amount + installmentPaid);
  loan.balance_amount = roundLKR(
    Math.max(0, (loan.total_payable ?? loan.balance_amount) - loan.paid_amount)
  );

  const hasOverdue = installments.some(
    (i) =>
      i.paid_amount < i.installment_amount &&
      isDateBefore(i.due_date, paymentDate)
  );
  loan.status = hasOverdue ? 'OVERDUE' : 'ACTIVE';
  if (loan.balance_amount <= 0) loan.status = 'COMPLETED';
  loan.updated_at = ts;

  syncFixedInstallmentLateFees(db, loanId, paymentDate);
}
