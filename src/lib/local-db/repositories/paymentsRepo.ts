import type { PaymentMethod } from '../../../types/loan';
import {
  allocateFixedInstallmentPayment,
  allocateInterestOnlyPaymentLines,
  summarizeFixedInstallmentDue,
  summarizeFixedInstallmentPaid,
  type InstallmentForAllocation,
} from '../../finance/paymentAllocation';
import { runLateFeeEngine } from '../../finance/fixedInstallmentStatus';
import {
  buildLateFeeExemptByInstallmentId,
  createLateFeeExemptAfterAllocationFn,
  toLateFeeExemptRecord,
} from '../../finance/lateFeeExemption';
import { getLateFeeLineByInstallmentId } from '../../finance/lateFeeEngineV3';
import { deriveInterestCycleStatus } from '../../finance/interestOnly';
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
import { persistInterestOnlyCycles, applyPrincipalReductionToCycle, reconcilePendingFutureInterestCycles } from '../interestOnlySync';
import { buildPaymentBundle, resolveCurrentInstallmentNumber } from '../paymentBundle';
import { generateCode, generateId, getDb, saveDb } from '../localDb';
import { mapLegacyPayment, mapLoanPayment } from '../mappers';
import type { MamDemoDb } from '../types';
import type { LoanPayment } from '../../../types/entities';
import { buildAuditSummary, uiError } from '../../i18n/messages';
import type { PaymentAllocationResult } from '../../finance/paymentAllocation';
import { getSystemTimestamp, isDateBefore } from '../../time/systemTime';
import { autoReleaseGuaranteesIfLoanJustSettled } from './guaranteeRelease';
import {
  preserveLateFeeChargedAmount,
  summarizePaymentBreakdown,
} from '../../display/paymentLedgerBreakdown';
import { createPaymentReceiptDocument } from '../../documents/documentService';

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
    const lateFeeExemptByInstallmentId = toLateFeeExemptRecord(
      buildLateFeeExemptByInstallmentId(db, loan.id)
    );
    const fixedCtx = {
      installments,
      paymentDate: input.paymentDate,
      lateFeeRatePercent: loan.late_fee_rate,
      monthlyInstallmentAmount: loan.installment_amount,
      currentInstallmentNumber: currentNum,
      loanBalanceAmount: loan.balance_amount,
      lateFeeExemptByInstallmentId,
      recomputeLateFeeExemptAfterAllocation: createLateFeeExemptAfterAllocationFn(
        db,
        loan.id,
        lateFeeExemptByInstallmentId,
        installments,
        input.paymentDate
      ),
    };
    fixedDueBeforeTotal = summarizeFixedInstallmentDue(
      fixedCtx,
      input.paymentDate
    ).totalDue;
    allocation = allocateFixedInstallmentPayment(fixedCtx, totalApply);
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

  const paymentBreakdown = summarizePaymentBreakdown(merged.allocations);

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
    installment_paid: paymentBreakdown.installmentPaid,
    late_fee_paid: paymentBreakdown.lateFeePaid,
    interest_paid: paymentBreakdown.interestPaid,
    principal_paid: paymentBreakdown.principalPaid,
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

  createPaymentReceiptDocument(db, paymentId, receiptBreakdown);

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
  const wasSettled = loan.status === 'COMPLETED' || loan.status === 'SETTLED';
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
        cycle.status = deriveInterestCycleStatus(
          cycle.interest_due,
          cycle.interest_paid
        );
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
      applyPrincipalReductionToCycle(
        cycles,
        line.amount,
        paymentDate,
        ts
      );
    }
  }

  reconcilePendingFutureInterestCycles(cycles, ts);

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
  autoReleaseGuaranteesIfLoanJustSettled(db, loan, wasSettled, paymentDate);

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
  const wasSettled = loan.status === 'COMPLETED' || loan.status === 'SETTLED';
  const installments = db.loan_installments.filter((i) => i.loan_id === loanId);

  const lateFeeExemptByInstallmentId = toLateFeeExemptRecord(
    buildLateFeeExemptByInstallmentId(db, loanId)
  );

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
      { paymentDate, lateFeeExemptByInstallmentId }
    );
    for (const inst of installments) {
      const line = getLateFeeLineByInstallmentId(engine, inst.id);
      const isExempt = lateFeeExemptByInstallmentId[inst.id] === true;
      const computed = isExempt ? 0 : (line?.lateFee ?? 0);
      inst.late_fee_amount = isExempt
        ? roundLKR(Math.max(inst.late_fee_paid, 0))
        : preserveLateFeeChargedAmount(
            inst.late_fee_amount,
            computed,
            inst.late_fee_paid
          );
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
  autoReleaseGuaranteesIfLoanJustSettled(db, loan, wasSettled, paymentDate);

  syncFixedInstallmentLateFees(db, loanId, paymentDate);
}

export type InterestOnlyPrincipalSettlementKind = 'HALF' | 'FULL';

export interface RecordInterestOnlyPrincipalSettlementInput {
  loanId: string;
  customerId: string;
  /** Half or full of current principal — ignored when principalAmount is set. */
  kind?: InterestOnlyPrincipalSettlementKind;
  /** Explicit principal reduction (LKR). Takes precedence over kind. */
  principalAmount?: number;
  paymentDate: string;
  paymentMethod?: PaymentMethod;
  clientSubmitId?: string;
}

function ioSettlementNote(kind: InterestOnlyPrincipalSettlementKind): string {
  return kind === 'HALF' ? 'IO_SETTLEMENT:HALF' : 'IO_SETTLEMENT:FULL';
}

function principalSettlementAmount(
  currentPrincipal: number,
  kind: InterestOnlyPrincipalSettlementKind
): number {
  if (kind === 'FULL') return roundLKR(currentPrincipal);
  return roundLKR(currentPrincipal / 2);
}

/** Interest-only principal settlement — half (50%) or full (100%) of current balance. */
export function recordInterestOnlyPrincipalSettlement(
  input: RecordInterestOnlyPrincipalSettlementInput,
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
    if (loan.repayment_method !== 'INTEREST_ONLY_REDUCING_PRINCIPAL') {
      throw new Error(uiError('interestOnlySettlementOnly'));
    }
    if (loan.status === 'COMPLETED' || loan.status === 'SETTLED') {
      throw new Error(uiError('loanAlreadyCompleted'));
    }

    persistInterestOnlyCycles(db, input.loanId, input.paymentDate);

    const balanceBefore = loan.current_principal_balance;
    const cashAmount =
      input.principalAmount != null
        ? roundLKR(Math.min(roundLKR(input.principalAmount), balanceBefore))
        : principalSettlementAmount(balanceBefore, input.kind!);
    if (cashAmount <= 0) {
      throw new Error(uiError('enterPaymentAmount'));
    }
    if (input.principalAmount == null && input.kind == null) {
      throw new Error(uiError('enterPaymentAmount'));
    }

    const newPrincipal = roundLKR(balanceBefore - cashAmount);
    const merged: PaymentAllocationResult = {
      allocations: [
        {
          allocationType: 'PRINCIPAL',
          amount: cashAmount,
        },
      ],
      totalAllocated: cashAmount,
      unallocated: 0,
      summary: {
        lateFeesPaid: 0,
        installmentsPaid: 0,
        currentMonthPaid: 0,
        advanceAmount: 0,
        interestPaid: 0,
        principalPaid: cashAmount,
        newPrincipal,
        pendingInterestRemaining: loan.pending_interest_amount ?? 0,
        loanBalanceAfter: newPrincipal,
      },
    };

    applyInterestOnlyAllocation(db, loan.id, merged, input.paymentDate, getSystemTimestamp());

    const paymentId = generateId();
    const paymentCode = generateCode('PAY', db.counters);
    const receiptNumber = generateCode('RCP', db.counters);
    const ts = getSystemTimestamp();
    const method = input.paymentMethod ?? 'CASH';

    const paymentRow = {
      id: paymentId,
      payment_code: paymentCode,
      loan_id: loan.id,
      customer_id: input.customerId,
      amount: cashAmount,
      discount_amount: 0,
      applied_amount: cashAmount,
      payment_method: methodToDb(method),
      payment_date: input.paymentDate,
      receipt_number: receiptNumber,
      client_submit_id: input.clientSubmitId,
      notes:
        input.principalAmount != null
          ? input.kind
            ? ioSettlementNote(input.kind)
            : 'IO_PRINCIPAL_PAYMENT'
          : ioSettlementNote(input.kind!),
      status: 'CONFIRMED' as const,
      installment_paid: 0,
      late_fee_paid: 0,
      interest_paid: 0,
      principal_paid: cashAmount,
      created_at: ts,
      updated_at: ts,
    };
    db.loan_payments.push(paymentRow);

    for (const line of merged.allocations) {
      db.payment_allocations.push({
        id: generateId(),
        payment_id: paymentId,
        loan_id: loan.id,
        allocation_type: line.allocationType,
        amount: line.amount,
        created_at: ts,
      });
    }

    const receiptBreakdown = buildInterestOnlyReceipt(
      merged,
      loan.interest_rate,
      balanceBefore,
      cashAmount,
      0
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

    createPaymentReceiptDocument(db, paymentId, receiptBreakdown);

    db.audit_logs.push({
      id: generateId(),
      user_id: db.profiles[0]?.id ?? 'system',
      action: 'PAYMENT',
      entity_type: 'payment',
      entity_id: paymentId,
      summary: buildAuditSummary('ioPrincipalSettlementAuditSummary', {
        kind: input.kind ?? 'PARTIAL',
        loanCode: loan.loan_code,
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
