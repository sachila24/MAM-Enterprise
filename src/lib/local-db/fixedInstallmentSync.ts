import {
  calculateInstallmentLateFee,
  getInstallmentDisplayStatus,
  type InstallmentArrearsInput,
} from '../finance/fixedInstallmentStatus';
import { getDb, saveDb } from './localDb';
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

  const ts = new Date().toISOString();
  let changed = false;

  for (const inst of db.loan_installments.filter((i) => i.loan_id === loanId)) {
    const input = toInput(inst);
    const { lateFeeAmount } = calculateInstallmentLateFee(
      input,
      loan.late_fee_rate,
      asOfDate
    );
    const nextStatus = getInstallmentDisplayStatus(
      input,
      asOfDate,
      loan.late_fee_rate
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
  asOfDate: string = new Date().toISOString().split('T')[0]
): boolean {
  const changed = mutateFixedInstallmentLateFees(db, loanId, asOfDate);
  if (changed) {
    saveDb(db);
  }
  return changed;
}

export function syncAllFixedInstallmentLateFees(
  db: MamDemoDb = getDb(),
  asOfDate: string = new Date().toISOString().split('T')[0]
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
