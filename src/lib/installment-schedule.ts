import type { Loan } from '../types/entities';

export interface InstallmentRow {
  installmentNo: number;
  dueDate: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
}

export function buildInstallmentSchedule(loan: Loan | undefined): InstallmentRow[] {
  if (!loan) return [];

  const schedule: InstallmentRow[] = [];
  const startDate = new Date(loan.startDate);

  for (let i = 0; i < loan.installmentsTotal; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(startDate.getMonth() + i + 1);

    let status: InstallmentRow['status'] = 'pending';
    if (i < loan.installmentsPaid) {
      status = 'paid';
    } else if (loan.status === 'overdue' && i === loan.installmentsPaid) {
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
