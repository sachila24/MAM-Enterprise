import type {
  Bike,
  Customer,
  Expense,
  Guarantee,
  Loan,
  LoanInstallment,
  LoanInterestCycle,
  LoanPayment,
  Payment,
} from '../../types/entities';
import { roundLKR } from '../finance/money';
import type {
  DbBike,
  DbCustomer,
  DbExpense,
  DbGuarantee,
  DbLoan,
  DbLoanInstallment,
  DbLoanInterestCycle,
  DbLoanPayment,
  MamDemoDb,
} from './types';

export function mapCustomer(c: DbCustomer, db: MamDemoDb): Customer {
  const loans = db.loans.filter(
    (l) => l.customer_id === c.id && !['CANCELLED', 'COMPLETED', 'SETTLED'].includes(l.status)
  );
  return {
    id: c.id,
    customerCode: c.customer_code,
    name: c.full_name,
    phone: c.phone,
    address: c.address,
    nic: c.nic,
    status: c.status === 'ACTIVE' ? 'active' : 'inactive',
    createdAt: c.created_at,
    outstandingBalance: loans.reduce((s, l) => s + l.balance_amount, 0),
    activeLoans: loans.length,
  };
}

export function mapBike(b: DbBike): Bike {
  const soldPrice = b.sold_price ?? b.selling_price;
  return {
    id: b.id,
    bikeCode: b.bike_code,
    model: b.model,
    registrationNo: b.registration_no,
    chassisNo: b.chassis_no,
    engineNo: b.engine_no,
    price: b.selling_price,
    costPrice: b.cost_price,
    sellingPrice: b.selling_price,
    soldPrice: b.status === 'SOLD' ? soldPrice : undefined,
    repairCost: b.repair_cost ?? 0,
    otherCost: b.other_cost ?? 0,
    status:
      b.status === 'IN_STOCK'
        ? 'in_stock'
        : b.status === 'SOLD'
          ? 'sold'
          : 'held',
    purchaseDate: b.purchase_date,
    soldDate: b.sold_date,
    color: b.color,
    year: b.year,
    soldLoanId: b.sold_loan_id,
  };
}

export function mapLoan(l: DbLoan): Loan {
  return {
    id: l.id,
    loanCode: l.loan_code,
    loanPurpose: l.loan_purpose,
    repaymentMethod: l.repayment_method,
    customerId: l.customer_id,
    bikeId: l.bike_id,
    principalAmount: l.principal_amount,
    originalPrincipalAmount: l.original_principal_amount,
    currentPrincipalBalance: l.current_principal_balance,
    interestRate: l.interest_rate,
    interestRatePeriod: l.interest_rate_period,
    interestCalculationType: l.interest_calculation_type,
    termMonths: l.term_months,
    totalInterestAmount: l.total_interest_amount,
    totalBeforeDiscount: l.total_before_discount,
    discountAmount: l.discount_amount,
    totalPayable: l.total_payable,
    paidAmount: l.paid_amount,
    balanceAmount: l.balance_amount,
    installmentAmount: l.installment_amount,
    lateFeeRate: l.late_fee_rate,
    startDate: l.start_date,
    firstDueDate: l.first_due_date,
    dueDay: l.due_day,
    dueDate: l.due_date,
    minimumMonthsBeforeSettlement: l.minimum_months_before_settlement,
    status: l.status,
    notes: l.notes,
    pendingInterestAmount: l.pending_interest_amount,
    createdAt: l.created_at,
    updatedAt: l.updated_at,
  };
}

export function mapInstallment(i: DbLoanInstallment): LoanInstallment {
  return {
    id: i.id,
    loanId: i.loan_id,
    installmentNumber: i.installment_number,
    dueDate: i.due_date,
    principalComponent: i.principal_component,
    interestComponent: i.interest_component,
    installmentAmount: i.installment_amount,
    paidAmount: i.paid_amount,
    lateFeeAmount: i.late_fee_amount,
    lateFeePaid: i.late_fee_paid,
    status: i.status,
    paidAt: i.paid_at,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
  };
}

export function mapInterestCycle(c: DbLoanInterestCycle): LoanInterestCycle {
  return {
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
  };
}

export function mapLoanPayment(p: DbLoanPayment): LoanPayment {
  const disc = p.discount_amount ?? 0;
  return {
    id: p.id,
    paymentCode: p.payment_code,
    loanId: p.loan_id,
    customerId: p.customer_id,
    amount: p.amount,
    discountAmount: disc,
    appliedAmount: roundLKR(p.applied_amount ?? p.amount + disc),
    paymentMethod: p.payment_method,
    chequeNumber: p.cheque_number,
    bankReference: p.bank_reference,
    paymentDate: p.payment_date,
    receiptNumber: p.receipt_number,
    notes: p.notes,
    status: p.status,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export function mapLegacyPayment(p: DbLoanPayment): Payment {
  const methodMap = {
    CASH: 'CASH' as const,
    BANK_TRANSFER: 'BANK_TRANSFER' as const,
    CHEQUE: 'CHEQUE' as const,
    OTHER: 'CASH' as const,
  };
  return {
    id: p.id,
    loanId: p.loan_id,
    receiptNo: p.receipt_number,
    amount: p.amount,
    method: methodMap[p.payment_method],
    status: p.status === 'CONFIRMED' ? 'confirmed' : 'voided',
    paidAt: p.payment_date,
  };
}

export function mapGuarantee(g: DbGuarantee): Guarantee {
  return {
    id: g.id,
    guaranteeCode: g.guarantee_code,
    loanId: g.loan_id,
    type: g.item_type,
    fileNumber: g.file_number,
    vehicleNumber: g.vehicle_number,
    guarantor1Name: g.guarantor1_name,
    guarantor1Address: g.guarantor1_address,
    guarantor1Phone: g.guarantor1_phone,
    guarantor1Nic: g.guarantor1_nic,
    guarantor2Name: g.guarantor2_name,
    guarantor2Address: g.guarantor2_address,
    guarantor2Phone: g.guarantor2_phone,
    guarantor2Nic: g.guarantor2_nic,
    itemReference: g.item_reference,
    ownerNameOnDocument: g.owner_name_on_document,
    description: g.description ?? '',
    storageLocation: g.storage_location ?? '',
    notes: g.notes,
    status: g.status === 'HELD' ? 'held' : 'returned',
    receivedAt: g.received_at,
    releasedAt: g.released_at,
    releasedTo: g.released_to,
  };
}

export function mapExpense(e: DbExpense): Expense {
  return {
    id: e.id,
    category: e.category,
    amount: e.amount,
    date: e.expense_date,
    notes: e.notes,
  };
}
