import {
  calculateEarlySettlementQuote,
  computeFixedInstallmentSettlementBalance,
  earlySettlementPaymentNote,
} from '../../finance/earlySettlement';
import { roundLKR } from '../../finance/money';
import type { PaymentAllocationResult } from '../../finance/paymentAllocation';
import { buildFixedInstallmentReceipt } from '../../finance/receipt';
import { summarizePaymentBreakdown } from '../../display/paymentLedgerBreakdown';
import { createPaymentReceiptDocument } from '../../documents/documentService';
import { generateCode, generateId, getDb, saveDb } from '../localDb';
import type { MamDemoDb } from '../types';
import { buildAuditSummary, uiError } from '../../i18n/messages';
import { getSystemTimestamp } from '../../time/systemTime';
import { autoReleaseGuaranteesForSettledLoan } from './guaranteeRelease';

export interface ConfirmEarlySettlementInput {
  loanId: string;
  settlementDate: string;
  discountPercentage: number;
  includeCurrentMonthDue: boolean;
}

export interface ConfirmEarlySettlementResult {
  settlementCode: string;
  paymentId: string;
  receiptNumber: string;
}

function buildEarlySettlementAllocations(
  quote: ReturnType<typeof calculateEarlySettlementQuote>,
  currentInstallmentId: string | undefined
): PaymentAllocationResult['allocations'] {
  const lines: PaymentAllocationResult['allocations'] = [];

  if (quote.remainingPrincipal > 0) {
    lines.push({
      allocationType: 'SETTLEMENT',
      amount: quote.remainingPrincipal,
    });
  }

  if (quote.discountedRemainingInterest > 0) {
    lines.push({
      allocationType: 'INTEREST',
      amount: quote.discountedRemainingInterest,
    });
  }

  if (quote.discountAmount > 0) {
    lines.push({
      allocationType: 'INTEREST_DISCOUNT',
      amount: quote.discountAmount,
    });
  }

  if (quote.currentMonthDue > 0) {
    lines.push({
      allocationType: 'INSTALLMENT',
      amount: quote.currentMonthDue,
      installmentId: currentInstallmentId,
    });
  }

  return lines;
}

export function confirmEarlySettlement(
  input: ConfirmEarlySettlementInput,
  db: MamDemoDb = getDb()
): ConfirmEarlySettlementResult {
  const loan = db.loans.find((l) => l.id === input.loanId);
  if (!loan) throw new Error(uiError('loanNotFound'));
  if (loan.repayment_method !== 'FIXED_TERM_INSTALLMENT') {
    throw new Error(uiError('earlySettlementFixedOnly'));
  }

  const installments = db.loan_installments.filter((i) => i.loan_id === loan.id);
  const monthsCompleted = installments.filter((i) => i.status === 'PAID').length;

  const totalPayable = loan.total_payable ?? loan.balance_amount;
  const balanceBefore = loan.balance_amount;
  const totalInterest =
    loan.total_interest_amount ??
    roundLKR(Math.max(0, totalPayable - loan.principal_amount));

  const settlementBalance = computeFixedInstallmentSettlementBalance(
    loan.principal_amount,
    totalInterest,
    installments.map((i) => ({
      principalComponent: i.principal_component,
      interestComponent: i.interest_component,
      installmentAmount: i.installment_amount,
      paidAmount: i.paid_amount,
    }))
  );

  const currentInst = installments.find(
    (i) => i.paid_amount < i.installment_amount && i.status !== 'PAID'
  );
  const currentMonthDue = currentInst
    ? roundLKR(currentInst.installment_amount - currentInst.paid_amount)
    : 0;

  const quote = calculateEarlySettlementQuote({
    startDate: loan.start_date,
    asOfDate: input.settlementDate,
    minimumMonthsBeforeSettlement: loan.minimum_months_before_settlement,
    balance: settlementBalance,
    discountPercentage: input.discountPercentage,
    currentMonthDue,
    includeCurrentMonthDue: input.includeCurrentMonthDue,
  });

  if (!quote.eligible) {
    throw new Error(
      uiError('earlySettlementMonthsRequired', {
        months: String(loan.minimum_months_before_settlement),
      })
    );
  }

  const ts = getSystemTimestamp();
  const settlementCode = generateCode('EST', db.counters);
  const paymentId = generateId();
  const paymentCode = generateCode('PAY', db.counters);
  const receiptNumber = generateCode('RCP', db.counters);
  const cashAmount = quote.finalSettlementAmount;

  const allocationLines = buildEarlySettlementAllocations(
    quote,
    currentInst?.id
  );
  const ledgerBreakdown = summarizePaymentBreakdown(allocationLines);

  const merged: PaymentAllocationResult = {
    allocations: allocationLines,
    totalAllocated: cashAmount,
    unallocated: 0,
    summary: {
      lateFeesPaid: 0,
      installmentsPaid: quote.currentMonthDue,
      currentMonthPaid: quote.currentMonthDue,
      advanceAmount: 0,
      interestPaid: quote.discountedRemainingInterest,
      principalPaid: quote.remainingPrincipal,
      loanBalanceAfter: 0,
      totalDueBeforePayment: balanceBefore,
      arrearsRemainingAfter: 0,
    },
  };

  const receiptBreakdown = buildFixedInstallmentReceipt(
    merged,
    balanceBefore,
    balanceBefore,
    cashAmount,
    quote.discountAmount,
    {
      monthlyInstallment: loan.installment_amount,
      lateFeeRate: loan.late_fee_rate,
      paymentDate: input.settlementDate,
      schedule: installments.map((i) => ({
        id: i.id,
        installmentNumber: i.installment_number,
        dueDate: i.due_date,
        installmentAmount: i.installment_amount,
        paidAmount: i.paid_amount,
        lateFeePaid: i.late_fee_paid,
      })),
    }
  );

  const settlementId = generateId();
  db.early_settlements.push({
    id: settlementId,
    settlement_code: settlementCode,
    loan_id: loan.id,
    customer_id: loan.customer_id,
    settlement_date: input.settlementDate,
    months_completed: monthsCompleted,
    remaining_principal: settlementBalance.remainingPrincipal,
    remaining_interest: settlementBalance.remainingInterest,
    discount_percentage: input.discountPercentage,
    discount_amount: quote.discountAmount,
    current_month_due: quote.currentMonthDue,
    final_settlement_amount: quote.finalSettlementAmount,
    status: 'PAID',
    payment_id: paymentId,
    created_at: ts,
  });

  db.loan_payments.push({
    id: paymentId,
    payment_code: paymentCode,
    loan_id: loan.id,
    customer_id: loan.customer_id,
    amount: cashAmount,
    discount_amount: quote.discountAmount,
    applied_amount: cashAmount,
    payment_method: 'CASH',
    payment_date: input.settlementDate,
    receipt_number: receiptNumber,
    notes: earlySettlementPaymentNote(settlementCode),
    status: 'CONFIRMED',
    installment_paid: ledgerBreakdown.installmentPaid,
    late_fee_paid: ledgerBreakdown.lateFeePaid,
    interest_paid: ledgerBreakdown.interestPaid,
    principal_paid: ledgerBreakdown.principalPaid,
    created_at: ts,
    updated_at: ts,
  });

  for (const line of allocationLines) {
    if (line.amount <= 0) continue;
    db.payment_allocations.push({
      id: generateId(),
      payment_id: paymentId,
      loan_id: loan.id,
      allocation_type: line.allocationType,
      installment_id: line.installmentId,
      amount: line.amount,
      created_at: ts,
    });
  }

  db.receipts.push({
    id: generateId(),
    receipt_number: receiptNumber,
    payment_id: paymentId,
    loan_id: loan.id,
    customer_id: loan.customer_id,
    amount: cashAmount,
    issued_at: input.settlementDate,
    breakdown: {
      ...merged.summary,
      receipt: receiptBreakdown,
      earlySettlement: {
        settlementCode,
        settlementDate: input.settlementDate,
        remainingPrincipal: quote.remainingPrincipal,
        remainingInterest: quote.remainingInterest,
        discountPercentage: input.discountPercentage,
        discountAmount: quote.discountAmount,
        currentMonthDue: quote.currentMonthDue,
        finalSettlementAmount: quote.finalSettlementAmount,
      },
    },
    created_at: ts,
  });

  createPaymentReceiptDocument(db, paymentId, receiptBreakdown);

  loan.status = 'SETTLED';
  loan.balance_amount = 0;
  loan.paid_amount = totalPayable;
  loan.settled_at = input.settlementDate;
  loan.updated_at = ts;

  for (const inst of installments) {
    if (inst.paid_amount < inst.installment_amount) {
      inst.paid_amount = inst.installment_amount;
      inst.status = 'PAID';
      inst.paid_at = input.settlementDate;
      inst.updated_at = ts;
    }
  }

  autoReleaseGuaranteesForSettledLoan(db, loan.id, input.settlementDate);

  db.audit_logs.push({
    id: generateId(),
    user_id: db.profiles[0]?.id ?? 'system',
    action: 'EARLY_SETTLEMENT',
    entity_type: 'loan',
    entity_id: loan.id,
    summary: buildAuditSummary('earlySettlementAuditSummary', {
      code: settlementCode,
      loanCode: loan.loan_code,
    }),
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
      loanCode: loan.loan_code,
    }),
    created_at: ts,
  });

  saveDb(db);
  return { settlementCode, paymentId, receiptNumber };
}
