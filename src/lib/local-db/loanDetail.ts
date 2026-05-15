import { totalPendingInterest } from '../finance/interestOnly';
import type { LoanDetailData } from '../../pages/loans/loanDetailPreviewData';
import {
  mapCustomer,
  mapGuarantee,
  mapInstallment,
  mapLoan,
} from './mappers';
import type { MamDemoDb } from './types';
import { getDb } from './localDb';

export function getLoanDetailFromDb(
  loanId: string,
  db: MamDemoDb = getDb()
): LoanDetailData | null {
  const dbLoan = db.loans.find((l) => l.id === loanId);
  if (!dbLoan) return null;

  const customerRow = db.customers.find((c) => c.id === dbLoan.customer_id);
  if (!customerRow) return null;

  const loan = mapLoan(dbLoan);
  const customer = mapCustomer(customerRow, db);
  const installments = db.loan_installments
    .filter((i) => i.loan_id === loanId)
    .sort((a, b) => a.installment_number - b.installment_number)
    .map(mapInstallment);

  const interestCycles = db.loan_interest_cycles
    .filter((c) => c.loan_id === loanId)
    .sort((a, b) => a.cycle_number - b.cycle_number)
    .map((c) => ({
      id: c.id,
      loanId: c.loan_id,
      cycleNumber: c.cycle_number,
      periodStart: c.period_start,
      periodEnd: c.period_end,
      dueDate: c.due_date,
      openingPrincipal: c.opening_principal,
      interestRate: c.interest_rate,
      interestDue: c.interest_due,
      interestPaid: c.interest_paid,
      principalPaid: c.principal_paid,
      closingPrincipal: c.closing_principal,
      status: c.status,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

  const guarantees = db.guarantees
    .filter((g) => g.loan_id === loanId)
    .map(mapGuarantee);

  const principalPayments = db.loan_payments
    .filter((p) => p.loan_id === loanId && p.status === 'CONFIRMED')
    .flatMap((p) => {
      const principalAllocs = db.payment_allocations.filter(
        (a) => a.payment_id === p.id && a.allocation_type === 'PRINCIPAL'
      );
      return principalAllocs.map((a) => ({
        paymentCode: p.payment_code,
        paymentDate: p.payment_date,
        amount: p.amount,
        principalReduction: a.amount,
        principalAfter: 0,
      }));
    });

  const cycleAllocPreview = interestCycles.map((c) => ({
    id: c.id,
    cycleNumber: c.cycleNumber,
    dueDate: c.dueDate,
    openingPrincipal: c.openingPrincipal,
    interestDue: c.interestDue,
    interestPaid: c.interestPaid,
    principalPaid: c.principalPaid,
  }));
  const pending = totalPendingInterest(cycleAllocPreview);

  const start = new Date(dbLoan.start_date);
  const now = new Date();
  const monthsCompleted = Math.max(
    0,
    (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth())
  );

  return {
    loan: { ...loan, pendingInterestAmount: pending },
    customer,
    interestCycles,
    installments,
    guarantees,
    principalPayments,
    monthsCompleted,
  };
}

export function listLoanDetailLinks(db: MamDemoDb = getDb()) {
  return db.loans.map((l) => ({
    id: l.id,
    label: `${l.loan_code} — ${db.customers.find((c) => c.id === l.customer_id)?.full_name ?? 'Customer'}`,
  }));
}
