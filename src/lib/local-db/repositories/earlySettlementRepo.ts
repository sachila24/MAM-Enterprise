import { calculateEarlySettlementQuote } from '../../finance/earlySettlement';
import { roundLKR } from '../../finance/money';
import { generateCode, generateId, getDb, saveDb } from '../localDb';
import type { MamDemoDb } from '../types';
import { buildAuditSummary, uiError } from '../../i18n/messages';

export interface ConfirmEarlySettlementInput {
  loanId: string;
  settlementDate: string;
  discountPercentage: number;
  includeCurrentMonthDue: boolean;
}

export function confirmEarlySettlement(
  input: ConfirmEarlySettlementInput,
  db: MamDemoDb = getDb()
): { settlementCode: string } {
  const loan = db.loans.find((l) => l.id === input.loanId);
  if (!loan) throw new Error(uiError('loanNotFound'));
  if (loan.repayment_method !== 'FIXED_TERM_INSTALLMENT') {
    throw new Error(uiError('earlySettlementFixedOnly'));
  }

  const installments = db.loan_installments.filter((i) => i.loan_id === loan.id);
  const monthsCompleted = installments.filter((i) => i.status === 'PAID').length;

  const totalPayable = loan.total_payable ?? loan.balance_amount;
  const paidRatio = totalPayable > 0 ? loan.paid_amount / totalPayable : 0;
  const remainingPrincipal = roundLKR(loan.principal_amount * (1 - paidRatio));
  const remainingInterest = roundLKR(
    Math.max(0, loan.balance_amount - remainingPrincipal)
  );

  const currentInst = installments.find(
    (i) => i.paid_amount < i.installment_amount && i.status !== 'PAID'
  );
  const currentMonthDue = currentInst
    ? roundLKR(currentInst.installment_amount - currentInst.paid_amount)
    : 0;

  const quote = calculateEarlySettlementQuote({
    monthsCompleted,
    minimumMonthsBeforeSettlement: loan.minimum_months_before_settlement,
    remainingPrincipal,
    remainingInterest,
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

  const ts = new Date().toISOString();
  const settlementCode = generateCode('EST', db.counters);

  db.early_settlements.push({
    id: generateId(),
    settlement_code: settlementCode,
    loan_id: loan.id,
    customer_id: loan.customer_id,
    settlement_date: input.settlementDate,
    months_completed: monthsCompleted,
    remaining_principal: quote.remainingPrincipal,
    remaining_interest: quote.remainingInterest,
    discount_percentage: input.discountPercentage,
    discount_amount: quote.discountAmount,
    current_month_due: quote.currentMonthDue,
    final_settlement_amount: quote.finalSettlementAmount,
    status: 'PAID',
    created_at: ts,
  });

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

  saveDb(db);
  return { settlementCode };
}
