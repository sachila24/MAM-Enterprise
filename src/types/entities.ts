export interface Customer {
  id: string;
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
  model: string;
  chassisNo: string;
  engineNo: string;
  price: number;
  status: 'in_stock' | 'sold' | 'held';
  purchaseDate: string;
  sellingPrice: number;
  costPrice: number;
  color: string;
  year: number;
  soldDate?: string;
}

export interface Loan {
  id: string;
  customerId: string;
  bikeId?: string;
  type: 'cash' | 'bike';
  amount: number;
  balance: number;
  status: 'active' | 'overdue' | 'completed';
  startDate: string;
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  installmentAmount: number;
  nextDueDate: string;
  installmentsPaid: number;
  installmentsTotal: number;
  daysOverdue?: number;
}

export interface Payment {
  id: string;
  loanId: string;
  receiptNo: string;
  amount: number;
  method: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
  status: 'confirmed' | 'voided';
  paidAt: string;
}

export interface Guarantee {
  id: string;
  loanId: string;
  type: 'VEHICLE_BOOK' | 'GOLD' | 'ELECTRONICS' | 'OTHER';
  description: string;
  storageLocation: string;
  status: 'held' | 'released';
  receivedAt: string;
  releasedAt?: string;
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
  action: string;
  type: 'loan' | 'payment' | 'bike' | 'customer' | 'guarantee' | 'system';
  summary: string;
  referenceId: string;
}

export interface DashboardKpis {
  todayCollections: number;
  todayTarget: number;
  todayPaymentsCount: number;
  overdueCount: number;
  cashOnHand: number;
  outstandingPortfolio: number;
  monthNet: number;
  inStockCount: number;
  soldThisMonth: number;
}

export const EMPTY_DASHBOARD_KPIS: DashboardKpis = {
  todayCollections: 0,
  todayTarget: 0,
  todayPaymentsCount: 0,
  overdueCount: 0,
  cashOnHand: 0,
  outstandingPortfolio: 0,
  monthNet: 0,
  inStockCount: 0,
  soldThisMonth: 0,
};
