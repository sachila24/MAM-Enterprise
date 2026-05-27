/** Local demo DB — mirrors planned Supabase schema (development only). */

export interface DbProfile {
  id: string;
  full_name: string;
  email?: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  active: boolean;
  created_at: string;
}

export interface DbCustomer {
  id: string;
  customer_code: string;
  full_name: string;
  phone: string;
  address: string;
  nic: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface DbBike {
  id: string;
  /** Idempotency key for create — prevents duplicate bikes on rapid clicks */
  client_submit_id?: string;
  bike_code: string;
  model: string;
  /** Registration / number plate (falls back to chassis in UI if empty) */
  registration_no?: string;
  chassis_no: string;
  engine_no: string;
  color: string;
  year: number;
  cost_price: number;
  selling_price: number;
  /** Actual sale price when status is SOLD */
  sold_price?: number;
  repair_cost?: number;
  other_cost?: number;
  status: 'IN_STOCK' | 'SOLD' | 'HELD';
  purchase_date: string;
  sold_date?: string;
  sold_loan_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DbLoan {
  id: string;
  loan_code: string;
  loan_purpose: 'CASH_LOAN' | 'BIKE_INSTALLMENT';
  repayment_method:
    | 'INTEREST_ONLY_REDUCING_PRINCIPAL'
    | 'FIXED_TERM_INSTALLMENT';
  customer_id: string;
  bike_id?: string;
  principal_amount: number;
  original_principal_amount: number;
  current_principal_balance: number;
  interest_rate: number;
  interest_rate_period: 'MONTHLY' | 'YEARLY';
  interest_calculation_type: 'REDUCING_PRINCIPAL' | 'FLAT_TERM';
  term_months?: number;
  total_interest_amount?: number;
  total_before_discount?: number;
  discount_amount: number;
  total_payable?: number;
  paid_amount: number;
  balance_amount: number;
  installment_amount?: number;
  late_fee_rate: number;
  start_date: string;
  first_due_date: string;
  due_day?: number;
  due_date?: string;
  minimum_months_before_settlement: number;
  status: 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED' | 'SETTLED';
  notes?: string;
  pending_interest_amount: number;
  created_at: string;
  updated_at: string;
}

export interface DbLoanInstallment {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  principal_component: number;
  interest_component: number;
  installment_amount: number;
  paid_amount: number;
  late_fee_amount: number;
  late_fee_paid: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DbLoanInterestCycle {
  id: string;
  loan_id: string;
  cycle_number: number;
  period_start: string;
  period_end: string;
  due_date: string;
  opening_principal: number;
  interest_rate: number;
  interest_due: number;
  interest_paid: number;
  principal_paid: number;
  closing_principal: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  created_at: string;
  updated_at: string;
}

export interface DbLoanPayment {
  id: string;
  payment_code: string;
  loan_id: string;
  customer_id: string;
  amount: number;
  discount_amount?: number;
  applied_amount?: number;
  payment_method: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'OTHER';
  cheque_number?: string;
  bank_reference?: string;
  payment_date: string;
  receipt_number: string;
  /** Idempotency key — duplicate submits return the same payment */
  client_submit_id?: string;
  notes?: string;
  status: 'CONFIRMED' | 'VOIDED';
  /** Permanent allocation totals recorded at payment time */
  installment_paid?: number;
  late_fee_paid?: number;
  interest_paid?: number;
  principal_paid?: number;
  created_at: string;
  updated_at: string;
}

export interface DbPaymentAllocation {
  id: string;
  payment_id: string;
  loan_id: string;
  allocation_type:
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
  installment_id?: string;
  interest_cycle_id?: string;
  amount: number;
  created_at: string;
}

export interface DbEarlySettlement {
  id: string;
  settlement_code: string;
  loan_id: string;
  customer_id: string;
  settlement_date: string;
  months_completed: number;
  remaining_principal: number;
  remaining_interest: number;
  discount_percentage: number;
  discount_amount: number;
  current_month_due: number;
  final_settlement_amount: number;
  status: 'QUOTED' | 'PAID' | 'CANCELLED';
  created_at: string;
}

export interface DbGuarantee {
  id: string;
  guarantee_code: string;
  loan_id: string;
  customer_id: string;
  item_type: 'VEHICLE_BOOK' | 'BIKE' | 'GOLD' | 'ELECTRONICS' | 'OTHER';
  /** Simplified guarantee fields (all optional) */
  file_number?: string;
  vehicle_number?: string;
  guarantor1_name?: string;
  guarantor1_address?: string;
  guarantor1_phone?: string;
  guarantor1_nic?: string;
  guarantor2_name?: string;
  guarantor2_address?: string;
  guarantor2_phone?: string;
  guarantor2_nic?: string;
  /** Legacy fields — kept for existing saved rows */
  item_reference?: string;
  owner_name_on_document?: string;
  description?: string;
  storage_location?: string;
  notes?: string;
  status: 'HELD' | 'RELEASED';
  received_at: string;
  released_at?: string;
  released_to?: string;
  created_at: string;
}

export interface DbReceipt {
  id: string;
  receipt_number: string;
  payment_id: string;
  loan_id: string;
  customer_id: string;
  amount: number;
  issued_at: string;
  breakdown: Record<string, unknown>;
  created_at: string;
}

export interface DbExpense {
  id: string;
  expense_code: string;
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
  expense_date: string;
  notes: string;
  created_at: string;
}

export interface DbAuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  summary: string;
  created_at: string;
}

export type DocumentType =
  | 'LOAN_CREATION'
  | 'LOAN_RELEASE'
  | 'PAYMENT_RECEIPT'
  | 'CASH_SALE';

export type DocumentStatus = 'ISSUED' | 'VOID';

export interface DbDocument {
  id: string;
  document_number: string;
  document_type: DocumentType;
  loan_id?: string;
  payment_id?: string;
  customer_id?: string;
  bike_id?: string;
  created_at: string;
  created_by?: string;
  total_amount: number;
  status: DocumentStatus;
  locked: boolean;
  print_count: number;
  last_printed_at?: string;
  metadata_json: Record<string, unknown>;
}

export interface MamDemoDb {
  version: 1;
  profiles: DbProfile[];
  customers: DbCustomer[];
  bikes: DbBike[];
  loans: DbLoan[];
  loan_installments: DbLoanInstallment[];
  loan_interest_cycles: DbLoanInterestCycle[];
  loan_payments: DbLoanPayment[];
  payment_allocations: DbPaymentAllocation[];
  early_settlements: DbEarlySettlement[];
  guarantees: DbGuarantee[];
  receipts: DbReceipt[];
  documents: DbDocument[];
  expenses: DbExpense[];
  audit_logs: DbAuditLog[];
  /** Next sequence per code prefix e.g. CUS: 3 */
  counters: Record<string, number>;
}
