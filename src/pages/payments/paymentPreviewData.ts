/**
 * Typed preview bundles for Record Payment UI (no Supabase).
 * Load via empty-state actions only — not global mock data.
 */

import type { Customer, Loan } from '../../types/entities';
import type { InterestCycleForAllocation } from '../../lib/finance/interestOnly';
import type { InstallmentForAllocation } from '../../lib/finance/paymentAllocation';
import { DEFAULT_LATE_FEE_RATE_PERCENT } from '../../lib/finance/constants';

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

const previewCustomer: Customer = {
  id: 'preview-cust-1',
  customerCode: 'CUS-00001',
  name: 'Kasun Perera',
  phone: '0771234567',
  address: 'Colombo',
  nic: '199012345678',
  status: 'active',
  createdAt: '2026-01-01',
  outstandingBalance: 0,
  activeLoans: 1,
};

/** Principal 100,000 @ 5% — current interest due 5,000 */
export const INTEREST_ONLY_PREVIEW_BUNDLE: PaymentPreviewBundle = {
  id: 'interest-only-100k',
  label: 'Interest-only · LKR 100,000 @ 5%',
  customers: [previewCustomer],
  loans: [
    {
      id: 'preview-loan-io',
      loanCode: 'LN-IO-100K',
      loanPurpose: 'CASH_LOAN',
      repaymentMethod: 'INTEREST_ONLY_REDUCING_PRINCIPAL',
      customerId: previewCustomer.id,
      principalAmount: 100_000,
      originalPrincipalAmount: 100_000,
      currentPrincipalBalance: 100_000,
      interestRate: 5,
      interestRatePeriod: 'MONTHLY',
      interestCalculationType: 'REDUCING_PRINCIPAL',
      discountAmount: 0,
      paidAmount: 0,
      balanceAmount: 100_000,
      lateFeeRate: 0,
      startDate: '2026-05-15',
      firstDueDate: '2026-06-15',
      dueDay: 15,
      dueDate: '2026-06-15',
      minimumMonthsBeforeSettlement: 6,
      status: 'ACTIVE',
      pendingInterestAmount: 0,
      createdAt: '2026-05-15',
      updatedAt: '2026-05-15',
    },
  ],
  interestCyclesByLoanId: {
    'preview-loan-io': [
      {
        id: 'preview-cycle-1',
        cycleNumber: 1,
        dueDate: '2026-06-15',
        openingPrincipal: 100_000,
        interestDue: 5_000,
        interestPaid: 0,
        isCurrentCycle: true,
      },
    ],
  },
  installmentsByLoanId: {},
  currentInstallmentNumberByLoanId: {},
};

/** Fixed installment with Feb/Mar arrears — pay 45,000 in April */
export const FIXED_INSTALLMENT_PREVIEW_BUNDLE: PaymentPreviewBundle = {
  id: 'fixed-arrears',
  label: 'Fixed installment · arrears example',
  customers: [
    {
      ...previewCustomer,
      id: 'preview-cust-2',
      name: 'Nimal Silva',
      nic: '198512345678',
    },
  ],
  loans: [
    {
      id: 'preview-loan-fix',
      loanCode: 'LN-FIX-300K',
      loanPurpose: 'BIKE_INSTALLMENT',
      repaymentMethod: 'FIXED_TERM_INSTALLMENT',
      customerId: 'preview-cust-2',
      principalAmount: 300_000,
      originalPrincipalAmount: 300_000,
      currentPrincipalBalance: 300_000,
      interestRate: 2.5,
      interestRatePeriod: 'MONTHLY',
      interestCalculationType: 'FLAT_TERM',
      termMonths: 36,
      totalInterestAmount: 270_000,
      totalBeforeDiscount: 570_000,
      discountAmount: 0,
      totalPayable: 570_000,
      paidAmount: 0,
      balanceAmount: 570_000,
      installmentAmount: 15_834,
      lateFeeRate: DEFAULT_LATE_FEE_RATE_PERCENT,
      startDate: '2025-11-01',
      firstDueDate: '2025-12-01',
      dueDate: '2026-04-01',
      minimumMonthsBeforeSettlement: 6,
      status: 'OVERDUE',
      createdAt: '2025-11-01',
      updatedAt: '2026-04-01',
    },
  ],
  interestCyclesByLoanId: {},
  installmentsByLoanId: {
    'preview-loan-fix': [
      {
        id: 'inst-2',
        installmentNumber: 2,
        dueDate: '2026-02-01',
        installmentAmount: 15_834,
        paidAmount: 0,
        lateFeeAmount: 0,
        lateFeePaid: 0,
      },
      {
        id: 'inst-3',
        installmentNumber: 3,
        dueDate: '2026-03-01',
        installmentAmount: 15_834,
        paidAmount: 0,
        lateFeeAmount: 0,
        lateFeePaid: 0,
      },
      {
        id: 'inst-4',
        installmentNumber: 4,
        dueDate: '2026-04-01',
        installmentAmount: 15_834,
        paidAmount: 0,
        lateFeeAmount: 0,
        lateFeePaid: 0,
      },
    ],
  },
  currentInstallmentNumberByLoanId: {
    'preview-loan-fix': 4,
  },
};

export const PAYMENT_PREVIEW_BUNDLES: PaymentPreviewBundle[] = [
  INTEREST_ONLY_PREVIEW_BUNDLE,
  FIXED_INSTALLMENT_PREVIEW_BUNDLE,
];
