import {
  DEFAULT_LATE_FEE_RATE_PERCENT,
  DEFAULT_MINIMUM_MONTHS_BEFORE_SETTLEMENT,
  INTEREST_ONLY_LATE_FEE_RATE,
} from '../lib/finance/constants';

export {
  DEFAULT_LATE_FEE_RATE_PERCENT,
  DEFAULT_MINIMUM_MONTHS_BEFORE_SETTLEMENT,
  INTEREST_ONLY_LATE_FEE_RATE,
};

/** Loan purpose — product type */
export type LoanPurpose = 'CASH_LOAN' | 'BIKE_INSTALLMENT';

/** How repayments are structured */
export type RepaymentMethod =
  | 'INTEREST_ONLY_REDUCING_PRINCIPAL'
  | 'FIXED_TERM_INSTALLMENT';

export type InterestRatePeriod = 'MONTHLY' | 'YEARLY';

export type InterestCalculationType = 'REDUCING_PRINCIPAL' | 'FLAT_TERM';

export type LoanStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'SETTLED';

export type InstallmentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';

/** Unpaid past-due interest stays PENDING/PARTIAL (no late fee on this method). */
export type InterestCycleStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export type PaymentMethod = 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'OTHER';

export type LoanPaymentStatus = 'CONFIRMED' | 'VOIDED';

export type AllocationType =
  | 'INTEREST'
  | 'PRINCIPAL'
  | 'INSTALLMENT'
  | 'LATE_FEE'
  | 'ADVANCE'
  | 'SETTLEMENT'
  | 'INTEREST_DISCOUNT'
  | 'PRINCIPAL_DISCOUNT'
  | 'INSTALLMENT_DISCOUNT'
  | 'LATE_FEE_DISCOUNT';

export type EarlySettlementStatus = 'QUOTED' | 'PAID' | 'CANCELLED';

export interface Loan {
  id: string;
  loanCode: string;
  loanPurpose: LoanPurpose;
  repaymentMethod: RepaymentMethod;
  customerId: string;
  bikeId?: string;
  principalAmount: number;
  originalPrincipalAmount: number;
  currentPrincipalBalance: number;
  interestRate: number;
  interestRatePeriod: InterestRatePeriod;
  interestCalculationType: InterestCalculationType;
  termMonths?: number;
  totalInterestAmount?: number;
  totalBeforeDiscount?: number;
  discountAmount: number;
  totalPayable?: number;
  paidAmount: number;
  balanceAmount: number;
  installmentAmount?: number;
  lateFeeRate: number;
  startDate: string;
  firstDueDate: string;
  dueDay?: number;
  dueDate?: string;
  minimumMonthsBeforeSettlement: number;
  status: LoanStatus;
  notes?: string;
  cancelledReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  settledAt?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  /** Client-computed for overdue lists (fixed-term only) */
  daysOverdue?: number;
  /** Denormalized sum of unpaid interest cycles (interest-only) */
  pendingInterestAmount?: number;
  /** Opening / migration from manual ledger */
  isImported?: boolean;
  openingDate?: string;
  originalBookStartDate?: string;
  openingBalanceAtImport?: number;
  openingPaidBeforeSystem?: number;
  openingArrearsAtImport?: number;
  openingLateFeeAtImport?: number;
  importedNotes?: string;
  completedInstallmentsAtImport?: number;
}

/** Receipt / payment preview — interest-only */
export interface InterestOnlyPaymentPreview {
  currentPrincipal: number;
  currentCycleInterestDue: number;
  pendingInterest: number;
  totalInterestDue: number;
  paymentAmount: number;
  allocation: {
    interestPaid: number;
    principalPaid: number;
    remainingPrincipal: number;
    pendingInterestRemaining: number;
    nextEstimatedInterest: number;
  };
}

/** Receipt / payment preview — fixed installment */
export interface FixedInstallmentPaymentPreview {
  dueInstallments: Array<{
    installmentNumber: number;
    dueDate: string;
    amountDue: number;
    lateFeeDue: number;
  }>;
  currentInstallmentDue: number;
  totalLateFeesDue: number;
  totalDue: number;
  paymentAmount: number;
  allocation: {
    lateFeesPaid: number;
    installmentPaid: number;
    arrearsRemaining: number;
    loanBalanceAfter: number;
    advanceAmount: number;
  };
}

export interface LoanInstallment {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  principalComponent: number;
  interestComponent: number;
  installmentAmount: number;
  paidAmount: number;
  lateFeeAmount: number;
  lateFeePaid: number;
  status: InstallmentStatus;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanInterestCycle {
  id: string;
  loanId: string;
  cycleNumber: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  openingPrincipal: number;
  interestRate: number;
  interestDue: number;
  interestPaid: number;
  principalPaid: number;
  closingPrincipal: number;
  status: InterestCycleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LoanPayment {
  id: string;
  paymentCode: string;
  loanId: string;
  customerId: string;
  amount: number;
  /** Owner waiver / discount at payment time (not cash received) */
  discountAmount?: number;
  /** Cash + discount applied to the loan */
  appliedAmount?: number;
  paymentMethod: PaymentMethod;
  chequeNumber?: string;
  bankReference?: string;
  paymentDate: string;
  receiptNumber: string;
  notes?: string;
  status: LoanPaymentStatus;
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: string;
  receivedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  loanId: string;
  allocationType: AllocationType;
  installmentId?: string;
  interestCycleId?: string;
  amount: number;
  createdAt: string;
}

export interface EarlySettlement {
  id: string;
  settlementCode: string;
  loanId: string;
  customerId: string;
  settlementDate: string;
  monthsCompleted: number;
  remainingPrincipal: number;
  remainingInterest: number;
  discountPercentage: number;
  discountAmount: number;
  currentMonthDue: number;
  finalSettlementAmount: number;
  status: EarlySettlementStatus;
  createdBy?: string;
  createdAt: string;
}

/** Defaults when creating loans */
export const REPAYMENT_METHOD_BY_PURPOSE: Record<
  LoanPurpose,
  RepaymentMethod | null
> = {
  CASH_LOAN: null,
  BIKE_INSTALLMENT: 'FIXED_TERM_INSTALLMENT',
};

export function defaultRepaymentMethod(
  purpose: LoanPurpose
): RepaymentMethod | null {
  return REPAYMENT_METHOD_BY_PURPOSE[purpose];
}

export function isInterestOnlyLoan(loan: Pick<Loan, 'repaymentMethod'>): boolean {
  return loan.repaymentMethod === 'INTEREST_ONLY_REDUCING_PRINCIPAL';
}

export function isFixedInstallmentLoan(
  loan: Pick<Loan, 'repaymentMethod'>
): boolean {
  return loan.repaymentMethod === 'FIXED_TERM_INSTALLMENT';
}
