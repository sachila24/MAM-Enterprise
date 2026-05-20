import { countInterestCyclesDueByDate } from '../finance/dueDates';
import { resolveCurrentInstallmentNumber as resolveFixedCurrentInstallment } from '../finance/fixedInstallmentStatus';
import type { InterestCycleForAllocation } from '../finance/interestOnly';
import type { InstallmentForAllocation } from '../finance/paymentAllocation';
import type { PaymentPreviewBundle } from '../../pages/payments/paymentPreviewData';
import { mapCustomer, mapLoan } from './mappers';
import type { DbLoanInstallment, MamDemoDb } from './types';
import { getSystemToday } from '../time/systemTime';

function toInterestCycle(
  c: MamDemoDb['loan_interest_cycles'][0],
  isCurrent: boolean
): InterestCycleForAllocation {
  return {
    id: c.id,
    cycleNumber: c.cycle_number,
    dueDate: c.due_date,
    openingPrincipal: c.opening_principal,
    interestDue: c.interest_due,
    interestPaid: c.interest_paid,
    principalPaid: c.principal_paid,
    isCurrentCycle: isCurrent,
  };
}

function toInstallmentForAllocation(
  i: DbLoanInstallment
): InstallmentForAllocation {
  return {
    id: i.id,
    installmentNumber: i.installment_number,
    dueDate: i.due_date,
    installmentAmount: i.installment_amount,
    paidAmount: i.paid_amount,
    lateFeeAmount: i.late_fee_amount,
    lateFeePaid: i.late_fee_paid,
  };
}

/** Current installment = latest unpaid due on or before as-of date. */
export function resolveCurrentInstallmentNumber(
  installments: DbLoanInstallment[],
  asOfDate: string = getSystemToday()
): number {
  if (installments.length === 0) return 1;
  return resolveFixedCurrentInstallment(
    installments.map((i) => ({
      installmentNumber: i.installment_number,
      dueDate: i.due_date,
      installmentAmount: i.installment_amount,
      paidAmount: i.paid_amount,
      lateFeeAmount: i.late_fee_amount,
      lateFeePaid: i.late_fee_paid,
    })),
    asOfDate
  );
}

export function buildPaymentBundle(db: MamDemoDb): PaymentPreviewBundle {
  const activeLoans = db.loans.filter(
    (l) => !['CANCELLED', 'COMPLETED', 'SETTLED'].includes(l.status)
  );
  const customerIds = new Set(activeLoans.map((l) => l.customer_id));
  const customers = db.customers
    .filter((c) => customerIds.has(c.id))
    .map((c) => mapCustomer(c, db));

  const interestCyclesByLoanId: Record<string, InterestCycleForAllocation[]> =
    {};
  const installmentsByLoanId: Record<string, InstallmentForAllocation[]> = {};
  const currentInstallmentNumberByLoanId: Record<string, number> = {};

  for (const loan of activeLoans) {
    const cycles = db.loan_interest_cycles
      .filter((c) => c.loan_id === loan.id)
      .sort((a, b) => a.cycle_number - b.cycle_number);
    if (cycles.length > 0) {
      const dueCount = countInterestCyclesDueByDate(
        loan.start_date,
        getSystemToday()
      );
      interestCyclesByLoanId[loan.id] = cycles.map((c) =>
        toInterestCycle(c, c.cycle_number === dueCount)
      );
    }

    const installments = db.loan_installments
      .filter((i) => i.loan_id === loan.id)
      .sort((a, b) => a.installment_number - b.installment_number);
    if (installments.length > 0) {
      installmentsByLoanId[loan.id] = installments.map(toInstallmentForAllocation);
      currentInstallmentNumberByLoanId[loan.id] =
        resolveCurrentInstallmentNumber(installments);
    }
  }

  return {
    id: 'local-demo',
    label: 'Local demo data',
    customers,
    loans: activeLoans.map(mapLoan),
    interestCyclesByLoanId,
    installmentsByLoanId,
    currentInstallmentNumberByLoanId,
  };
}
