export interface Customer {
  id: string;
  customerCode?: string;
  name: string;
  phone: string;
  address: string;
  nic: string;
  status: 'active' | 'inactive';
  createdAt: string;
  outstandingBalance: number;
  activeLoans: number;
}

export interface Bike {
  id: string;
  bikeCode: string;
  model: string;
  registrationNo?: string;
  chassisNo: string;
  engineNo: string;
  price: number;
  status: 'in_stock' | 'sold' | 'held';
  purchaseDate: string;
  sellingPrice: number;
  costPrice: number;
  soldPrice?: number;
  repairCost: number;
  otherCost: number;
  color: string;
  year: number;
  soldDate?: string;
  soldLoanId?: string;
}

export type {
  Loan,
  LoanPurpose,
  RepaymentMethod,
  LoanStatus,
  LoanInstallment,
  LoanInterestCycle,
  LoanPayment,
  PaymentAllocation,
  EarlySettlement,
  PaymentMethod,
  LoanPaymentStatus,
  AllocationType,
} from './loan';

export {
  defaultRepaymentMethod,
  isInterestOnlyLoan,
  isFixedInstallmentLoan,
} from './loan';

/** @deprecated Use LoanPayment — kept for receipts list during UI migration */
export interface Payment {
  id: string;
  loanId: string;
  receiptNo: string;
  amount: number;
  method: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
  status: 'confirmed' | 'voided';
  paidAt: string;
}

export function toLegacyPayment(p: import('./loan').LoanPayment): Payment {
  const methodMap = {
    CASH: 'CASH',
    BANK_TRANSFER: 'BANK_TRANSFER',
    CHEQUE: 'CHEQUE',
    OTHER: 'CASH',
  } as const;
  return {
    id: p.id,
    loanId: p.loanId,
    receiptNo: p.receiptNumber,
    amount: p.amount,
    method: methodMap[p.paymentMethod],
    status: p.status === 'CONFIRMED' ? 'confirmed' : 'voided',
    paidAt: p.paymentDate,
  };
}

export interface Guarantee {
  id: string;
  guaranteeCode: string;
  loanId: string;
  type: 'VEHICLE_BOOK' | 'BIKE' | 'GOLD' | 'ELECTRONICS' | 'OTHER';
  fileNumber?: string;
  vehicleNumber?: string;
  guarantor1Name?: string;
  guarantor1Address?: string;
  guarantor1Phone?: string;
  guarantor1Nic?: string;
  guarantor2Name?: string;
  guarantor2Address?: string;
  guarantor2Phone?: string;
  guarantor2Nic?: string;
  /** Legacy */
  itemReference?: string;
  ownerNameOnDocument?: string;
  description: string;
  storageLocation: string;
  notes?: string;
  status: 'held' | 'returned';
  receivedAt: string;
  releasedAt?: string;
  releasedTo?: string;
}

export interface Expense {
  id: string;
  category:
    | 'RENT'
    | 'UTILITIES'
    | 'SALARIES'
    | 'MAINTENANCE'
    | 'FUEL'
    | 'SUPPLIES'
    | 'MARKETING'
    | 'OTHER';
  amount: number;
  date: string;
  notes: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  active: boolean;
  lastSignIn: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  when: string;
  userId: string;
  /** Display name when staff list is unavailable */
  user?: string;
  action: string;
  type: 'loan' | 'payment' | 'bike' | 'customer' | 'guarantee' | 'system';
  summary: string;
  referenceId: string;
}

export interface DashboardKpis {
  todayExpectedCollections: number;
  todayPaymentsCount: number;
  overdueCount: number;
  inStockCount: number;
  soldThisMonth: number;
}

export const EMPTY_DASHBOARD_KPIS: DashboardKpis = {
  todayExpectedCollections: 0,
  todayPaymentsCount: 0,
  overdueCount: 0,
  inStockCount: 0,
  soldThisMonth: 0,
};
