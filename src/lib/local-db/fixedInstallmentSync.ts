import {
  buildLateFeeExemptByInstallmentId,
  toLateFeeExemptRecord,
} from '../finance/lateFeeExemption';
import {
  getInstallmentDisplayStatus,
  runLateFeeEngine,
  type InstallmentArrearsInput,
} from '../finance/fixedInstallmentStatus';
import { getLateFeeLineByInstallmentId } from '../finance/lateFeeEngineV3';
import { preserveLateFeeChargedAmount } from '../display/paymentLedgerBreakdown';
import { roundLKR } from '../finance/money';
import { getDb, saveDb } from './localDb';
import { getSystemToday, getSystemTimestamp } from '../time/systemTime';
import type { MamDemoDb } from './types';

function toInput(
  inst: MamDemoDb['loan_installments'][0]
): InstallmentArrearsInput {
  return {
    installmentNumber: inst.installment_number,
    dueDate: inst.due_date,
    installmentAmount: inst.installment_amount,
    paidAmount: inst.paid_amount,
    lateFeeAmount: inst.late_fee_amount,
    lateFeePaid: inst.late_fee_paid,
  };
}

function mutateFixedInstallmentLateFees(
  db: MamDemoDb,
  loanId: string,
  asOfDate: string
): boolean {
  const loan = db.loans.find((l) => l.id === loanId);
  if (!loan || loan.repayment_method !== 'FIXED_TERM_INSTALLMENT') {
    return false;
  }

  const ts = getSystemTimestamp();
  let changed = false;

  const loanInstallments = db.loan_installments.filter((i) => i.loan_id === loanId);
  const engineInputs = loanInstallments.map((inst) => ({
    ...toInput(inst),
    id: inst.id,
  }));
  const lateFeeExemptByInstallmentId = toLateFeeExemptRecord(
    buildLateFeeExemptByInstallmentId(db, loanId)
  );
  const engine = runLateFeeEngine(
    engineInputs,
    loan.installment_amount,
    loan.late_fee_rate,
    { asOfDate, lateFeeExemptByInstallmentId }
  );

  for (const inst of loanInstallments) {
    const input = toInput(inst);
    const line = getLateFeeLineByInstallmentId(engine, inst.id);
    const isExempt = lateFeeExemptByInstallmentId[inst.id] === true;
    const computedLateFee = isExempt ? 0 : (line?.lateFee ?? 0);
    const lateFeeAmount = isExempt
      ? roundLKR(Math.max(inst.late_fee_paid, 0))
      : preserveLateFeeChargedAmount(
          inst.late_fee_amount,
          computedLateFee,
          inst.late_fee_paid
        );
    const nextStatus = getInstallmentDisplayStatus(
      input,
      asOfDate,
      loan.late_fee_rate,
      loan.installment_amount
    );

    let instChanged = false;
    if (inst.late_fee_amount !== lateFeeAmount) {
      inst.late_fee_amount = lateFeeAmount;
      instChanged = true;
    }
    if (inst.status !== nextStatus) {
      inst.status = nextStatus;
      instChanged = true;
    }
    if (instChanged) {
      inst.updated_at = ts;
      changed = true;
    }
  }

  return changed;
}

export function syncFixedInstallmentLateFees(
  db: MamDemoDb,
  loanId: string,
  asOfDate: string = getSystemToday()
): boolean {
  const changed = mutateFixedInstallmentLateFees(db, loanId, asOfDate);
  if (changed) {
    saveDb(db);
  }
  return changed;
}

export function syncAllFixedInstallmentLateFees(
  db: MamDemoDb = getDb(),
  asOfDate: string = getSystemToday()
): void {
  let changed = false;
  for (const loan of db.loans) {
    if (loan.repayment_method !== 'FIXED_TERM_INSTALLMENT') continue;
    if (mutateFixedInstallmentLateFees(db, loan.id, asOfDate)) {
      changed = true;
    }
  }
  if (changed) {
    saveDb(db);
  }
}
