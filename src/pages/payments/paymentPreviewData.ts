/**
 * Shared bundle shape for payment computation (local DB adapter).
 */

import type { Customer, Loan } from '../../types/entities';
import type { InterestCycleForAllocation } from '../../lib/finance/interestOnly';
import type { InstallmentForAllocation } from '../../lib/finance/paymentAllocation';

export interface PaymentPreviewBundle {
  id: string;
  label: string;
  customers: Customer[];
  loans: Loan[];
  interestCyclesByLoanId: Record<string, InterestCycleForAllocation[]>;
  installmentsByLoanId: Record<string, InstallmentForAllocation[]>;
  currentInstallmentNumberByLoanId: Record<string, number>;
  /** 50% pre-grace late-fee exemption flags (fixed-term loans from local DB). */
  lateFeeExemptByInstallmentIdByLoanId?: Record<
    string,
    Record<string, boolean>
  >;
}
