import type { Loan, LoanInstallment } from '../types/entities';
import { isFixedInstallmentLoan } from '../types/loan';

export interface InstallmentRow {
  installmentNo: number;
  dueDate: string;
  amount: number;
  principalComponent?: number;
  interestComponent?: number;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
}

export function buildInstallmentScheduleFromRows(
  installments: LoanInstallment[]
): InstallmentRow[] {
  return installments
    .slice()
    .sort((a, b) => a.installmentNumber - b.installmentNumber)
    .map((row) => ({
      installmentNo: row.installmentNumber,
      dueDate: row.dueDate,
      amount: row.installmentAmount,
      principalComponent: row.principalComponent,
      interestComponent: row.interestComponent,
      status: mapInstallmentStatus(row.status),
    }));
}

function mapInstallmentStatus(
  status: LoanInstallment['status']
): InstallmentRow['status'] {
  switch (status) {
    case 'PAID':
      return 'paid';
    case 'OVERDUE':
      return 'overdue';
    case 'PARTIAL':
      return 'partial';
    default:
      return 'pending';
  }
}

/** Fallback schedule from loan header when installment rows are not loaded yet. */
export function buildInstallmentSchedule(loan: Loan | undefined): InstallmentRow[] {
  if (!loan || !isFixedInstallmentLoan(loan)) return [];
  if (!loan.termMonths || !loan.installmentAmount) return [];

  const schedule: InstallmentRow[] = [];
  const startDate = new Date(loan.firstDueDate);
  const paidCount = Math.floor(
    ((loan.paidAmount ?? 0) / (loan.installmentAmount || 1))
  );

  for (let i = 0; i < loan.termMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(startDate.getMonth() + i);

    let status: InstallmentRow['status'] = 'pending';
    if (i < paidCount) {
      status = 'paid';
    } else if (loan.status === 'OVERDUE' && i === paidCount) {
      status = 'overdue';
    }

    schedule.push({
      installmentNo: i + 1,
      dueDate: dueDate.toISOString().split('T')[0],
      amount: loan.installmentAmount,
      status,
    });
  }

  return schedule;
}
