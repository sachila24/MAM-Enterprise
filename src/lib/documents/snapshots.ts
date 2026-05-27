import { LATE_FEE_GRACE_DAYS } from '../finance/constants';
import { calculateLateFeePerMonth } from '../finance/fixedInstallment';
import { roundLKR } from '../finance/money';
import {
  getReceiptBalanceDisplay,
  type FixedInstallmentReceiptBreakdown,
  type InterestOnlyReceiptBreakdown,
} from '../finance/receipt';
import { mapBike, mapCustomer } from '../local-db/mappers';
import type { DbDocument, DbLoan, MamDemoDb } from '../local-db/types';
import type {
  CashSaleDocumentSnapshot,
  DocumentPartySnapshot,
  LoanCreationDocumentSnapshot,
  LoanReleaseDocumentSnapshot,
  PaymentReceiptDocumentSnapshot,
} from './types';

const EMPTY_PARTY: DocumentPartySnapshot = {
  name: '—',
  nic: '—',
  phone: '—',
  address: '—',
};

function partyFromCustomer(
  db: MamDemoDb,
  customerId: string
): DocumentPartySnapshot {
  const row = db.customers.find((c) => c.id === customerId);
  if (!row) return EMPTY_PARTY;
  const c = mapCustomer(row, db);
  return {
    name: c.name,
    nic: c.nic,
    phone: c.phone,
    address: c.address,
  };
}

function bikeSnapshotFromId(
  db: MamDemoDb,
  bikeId: string
): CashSaleDocumentSnapshot['bike'] | undefined {
  const row = db.bikes.find((b) => b.id === bikeId);
  if (!row) return undefined;
  const bike = mapBike(row);
  const modelParts = bike.model.trim().split(/\s+/);
  const brand = modelParts.length > 1 ? modelParts[0] : '—';
  return {
    bikeCode: bike.bikeCode,
    model: bike.model,
    brand,
    color: bike.color,
    year: bike.year,
    chassisNo: bike.chassisNo,
    engineNo: bike.engineNo,
    registrationNo: bike.registrationNo || bike.chassisNo,
    sellingPrice: bike.sellingPrice,
  };
}

export function buildLoanCreationSnapshot(
  db: MamDemoDb,
  loan: DbLoan,
  options?: { downPayment?: number }
): LoanCreationDocumentSnapshot {
  const customer = partyFromCustomer(db, loan.customer_id);
  const bike = loan.bike_id ? bikeSnapshotFromId(db, loan.bike_id) : undefined;
  const cashPrice = bike?.sellingPrice ?? loan.principal_amount;
  const downPayment =
    options?.downPayment ??
    (bike ? roundLKR(Math.max(0, cashPrice - loan.principal_amount)) : 0);
  const installments = db.loan_installments
    .filter((i) => i.loan_id === loan.id)
    .sort((a, b) => a.installment_number - b.installment_number);

  const collateral = db.guarantees
    .filter((g) => g.loan_id === loan.id)
    .map((g) => {
      const fileNumber = g.file_number?.trim();
      const vehicleNumber =
        g.vehicle_number?.trim() || g.item_reference?.trim();
      const guarantor1Name =
        g.guarantor1_name?.trim() || g.owner_name_on_document?.trim();
      const guarantor2Name = g.guarantor2_name?.trim();
      const description = g.description?.trim();
      const storageLocation = g.storage_location?.trim();
      const hasNew =
        fileNumber ||
        vehicleNumber ||
        guarantor1Name ||
        guarantor2Name;
      if (hasNew) {
        return {
          fileNumber: fileNumber || undefined,
          vehicleNumber: vehicleNumber || undefined,
          guarantor1Name: guarantor1Name || undefined,
          guarantor2Name: guarantor2Name || undefined,
        };
      }
      return {
        description: description || undefined,
        itemType: g.item_type,
        storageLocation: storageLocation || undefined,
      };
    })
    .filter(
      (c) =>
        c.fileNumber ||
        c.vehicleNumber ||
        c.guarantor1Name ||
        c.guarantor2Name ||
        c.description ||
        c.storageLocation
    );

  return {
    kind: 'LOAN_CREATION',
    loanCode: loan.loan_code,
    loanPurpose: loan.loan_purpose,
    repaymentMethod: loan.repayment_method,
    customer,
    guarantor: { ...EMPTY_PARTY },
    bike,
    cashPrice,
    downPayment,
    financeAmount: loan.principal_amount,
    interestAmount: loan.total_interest_amount ?? 0,
    discountAmount: loan.discount_amount,
    totalPayable:
      loan.total_payable ??
      loan.balance_amount ??
      loan.principal_amount,
    monthlyInstallment: loan.installment_amount ?? 0,
    installmentCount: loan.term_months ?? installments.length,
    lateFeeRatePercent: loan.late_fee_rate,
    gracePeriodDays: LATE_FEE_GRACE_DAYS,
    startDate: loan.start_date,
    firstDueDate: loan.first_due_date,
    installmentPlan: installments.map((i) => ({
      number: i.installment_number,
      dueDate: i.due_date,
      amount: i.installment_amount,
    })),
    collateral,
  };
}

function breakdownFromReceipt(
  receipt: FixedInstallmentReceiptBreakdown | InterestOnlyReceiptBreakdown,
  repaymentMethod: string
): PaymentReceiptDocumentSnapshot['appliedBreakdown'] {
  const isFixed = repaymentMethod === 'FIXED_TERM_INSTALLMENT';
  const isIo = repaymentMethod === 'INTEREST_ONLY_REDUCING_PRINCIPAL';
  const lateFeePaid =
    isFixed && 'lateFeePaid' in receipt ? receipt.lateFeePaid : 0;
  const installmentPaid =
    isFixed && 'installmentPaid' in receipt ? receipt.installmentPaid : 0;
  const interestPaid =
    isIo && 'interestPaid' in receipt ? receipt.interestPaid : 0;
  const principalPaid =
    isIo && 'principalPaid' in receipt ? receipt.principalPaid : 0;
  const { newBalance } = getReceiptBalanceDisplay(receipt);
  const remainingBalance = isFixed
    ? newBalance
    : isIo && 'remainingPrincipal' in receipt
      ? receipt.remainingPrincipal
      : 0;

  return {
    lateFeePaid,
    installmentPaid,
    interestPaid,
    principalPaid,
    totalApplied: receipt.totalApplied,
    cashReceived: receipt.cashReceived,
    remainingBalance,
  };
}

export function buildPaymentReceiptSnapshot(
  db: MamDemoDb,
  paymentId: string,
  receiptBreakdown:
    | FixedInstallmentReceiptBreakdown
    | InterestOnlyReceiptBreakdown
): PaymentReceiptDocumentSnapshot {
  const payment = db.loan_payments.find((p) => p.id === paymentId)!;
  const loan = db.loans.find((l) => l.id === payment.loan_id)!;
  const customer = db.customers.find((c) => c.id === payment.customer_id);
  const profile = db.profiles[0];

  return {
    kind: 'PAYMENT_RECEIPT',
    receiptNumber: payment.receipt_number,
    paymentCode: payment.payment_code,
    paymentDate: payment.payment_date,
    customerName: customer?.full_name ?? '—',
    loanCode: loan.loan_code,
    paidAmount: payment.amount,
    discountAmount: payment.discount_amount,
    paymentMethod: payment.payment_method,
    repaymentMethod: loan.repayment_method,
    cashierName: profile?.full_name ?? 'Staff',
    appliedBreakdown: breakdownFromReceipt(
      receiptBreakdown,
      loan.repayment_method
    ),
  };
}

export function buildLoanReleaseSnapshot(
  db: MamDemoDb,
  loan: DbLoan,
  options?: { releasedBy?: string; remarks?: string }
): LoanReleaseDocumentSnapshot {
  const customer = partyFromCustomer(db, loan.customer_id);
  const profile = db.profiles[0];
  return {
    kind: 'LOAN_RELEASE',
    releaseNoteNumber: '',
    releaseDate: loan.start_date,
    customer,
    loanCode: loan.loan_code,
    principalAmount: loan.principal_amount,
    releasedBy: options?.releasedBy?.trim() || profile?.full_name?.trim() || 'Staff',
    remarks: options?.remarks?.trim() || '',
  };
}

export function buildCashSaleSnapshot(
  db: MamDemoDb,
  bikeId: string,
  soldPrice: number,
  soldDate: string,
  repairCost: number,
  otherCost: number
): CashSaleDocumentSnapshot {
  const bike = bikeSnapshotFromId(db, bikeId);
  if (!bike) {
    throw new Error('Bike not found for cash sale document');
  }
  return {
    kind: 'CASH_SALE',
    soldDate,
    soldPrice,
    repairCost,
    otherCost,
    bike,
    buyerNote: 'Cash sale — walk-in buyer',
  };
}

export function readDocumentSnapshot(
  doc: DbDocument
):
  | LoanCreationDocumentSnapshot
  | LoanReleaseDocumentSnapshot
  | PaymentReceiptDocumentSnapshot
  | CashSaleDocumentSnapshot {
  const meta = doc.metadata_json as LoanCreationDocumentSnapshot;
  if (meta?.kind) return meta;
  throw new Error('Invalid document snapshot');
}

export function lateFeeRuleLabel(
  ratePercent: number,
  installmentAmount: number
): string {
  if (ratePercent <= 0) return '—';
  const fee = calculateLateFeePerMonth(installmentAmount, ratePercent);
  return `${ratePercent}% / month (≈ ${fee} LKR per overdue installment)`;
}
