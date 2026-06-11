import type { Customer, Guarantee, Bike } from '../../types/entities';
import type {
  Loan,
  LoanInstallment,
  LoanInterestCycle,
} from '../../types/loan';

export interface PrincipalPaymentRecord {
  paymentCode: string;
  paymentDate: string;
  amount: number;
  principalReduction: number;
  principalAfter: number;
}

export interface LoanLedgerPayment {
  paymentDate: string;
  amount: number;
  reference?: string;
  installmentPaid: number;
  lateFeePaid: number;
  interestPaid: number;
  principalPaid: number;
}

export interface LoanLedgerInstallment {
  installmentNumber: number;
  dueDate: string;
  installmentAmount: number;
  paidAmount: number;
  lateFeeAmount: number;
  lateFeePaid: number;
}

export interface LoanDetailData {
  loan: Loan;
  customer: Customer;
  bike?: Bike;
  interestCycles: LoanInterestCycle[];
  installments: LoanInstallment[];
  guarantees: Guarantee[];
  principalPayments: PrincipalPaymentRecord[];
  ledgerPayments: LoanLedgerPayment[];
  ledgerInstallments: LoanLedgerInstallment[];
  monthsCompleted: number;
  /** Fixed-term: installments with ≥50% paid pre-grace (no late-fee accrual). */
  lateFeeExemptByInstallmentId?: Record<string, boolean>;
}
