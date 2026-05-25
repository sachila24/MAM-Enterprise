/** Official finance documents — locked snapshots in metadata_json. */

export type DocumentType =
  | 'LOAN_CREATION'
  | 'PAYMENT_RECEIPT'
  | 'CASH_SALE';

export type DocumentStatus = 'ISSUED' | 'VOID';

export interface DocumentPartySnapshot {
  name: string;
  nic: string;
  phone: string;
  address: string;
}

export interface DocumentBikeSnapshot {
  bikeCode: string;
  model: string;
  brand: string;
  color: string;
  year: number;
  chassisNo: string;
  engineNo: string;
  registrationNo: string;
  sellingPrice: number;
}

export interface DocumentInstallmentLineSnapshot {
  number: number;
  dueDate: string;
  amount: number;
}

export interface LoanCreationDocumentSnapshot {
  kind: 'LOAN_CREATION';
  loanCode: string;
  loanPurpose: string;
  repaymentMethod: string;
  customer: DocumentPartySnapshot;
  guarantor: DocumentPartySnapshot;
  bike?: DocumentBikeSnapshot;
  cashPrice: number;
  downPayment: number;
  financeAmount: number;
  interestAmount: number;
  discountAmount: number;
  totalPayable: number;
  monthlyInstallment: number;
  installmentCount: number;
  lateFeeRatePercent: number;
  gracePeriodDays: number;
  startDate: string;
  firstDueDate: string;
  installmentPlan: DocumentInstallmentLineSnapshot[];
  collateral: Array<{
    fileNumber?: string;
    vehicleNumber?: string;
    guarantor1Name?: string;
    guarantor2Name?: string;
    /** Legacy snapshot rows */
    description?: string;
    itemType?: string;
    storageLocation?: string;
  }>;
}

export interface PaymentReceiptDocumentSnapshot {
  kind: 'PAYMENT_RECEIPT';
  receiptNumber: string;
  paymentCode: string;
  paymentDate: string;
  customerName: string;
  loanCode: string;
  paidAmount: number;
  discountAmount: number;
  paymentMethod: string;
  repaymentMethod: string;
  cashierName: string;
  appliedBreakdown: {
    lateFeePaid: number;
    installmentPaid: number;
    interestPaid: number;
    principalPaid: number;
    totalApplied: number;
    cashReceived: number;
    remainingBalance: number;
  };
}

export interface CashSaleDocumentSnapshot {
  kind: 'CASH_SALE';
  soldDate: string;
  soldPrice: number;
  repairCost: number;
  otherCost: number;
  bike: DocumentBikeSnapshot;
  buyerNote: string;
}

export type DocumentMetadataSnapshot =
  | LoanCreationDocumentSnapshot
  | PaymentReceiptDocumentSnapshot
  | CashSaleDocumentSnapshot;
