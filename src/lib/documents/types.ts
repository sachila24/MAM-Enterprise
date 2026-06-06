/** Official finance documents — locked snapshots in metadata_json. */

export type DocumentType =
  | 'LOAN_CREATION'
  | 'LOAN_RELEASE'
  | 'PAYMENT_RECEIPT'
  | 'CASH_SALE';

export type DocumentStatus = 'ISSUED' | 'VOID';

export interface DocumentGuarantorSnapshot {
  name?: string;
  nic?: string;
  phone?: string;
  address?: string;
}

export interface DocumentPartySnapshot {
  name: string;
  nic: string;
  phone: string;
  address: string;
  customerCode?: string;
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
  /** @deprecated Legacy single guarantor — use guarantors */
  guarantor: DocumentPartySnapshot;
  guarantors?: {
    guarantor1?: DocumentGuarantorSnapshot;
    guarantor2?: DocumentGuarantorSnapshot;
  };
  bike?: DocumentBikeSnapshot;
  /** Gross loan amount (selling price / loan amount before financing) */
  cashPrice: number;
  initialPayment: number;
  serviceFee: number;
  registrationFee: number;
  netAdvancePayment: number;
  /** Financed principal after net advance */
  financeAmount: number;
  /** @deprecated Legacy snapshots — use netAdvancePayment */
  downPayment?: number;
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
    /** @deprecated Legacy snapshots — guarantor names moved to guarantors section */
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
  customer: {
    name: string;
    customerCode?: string;
    nic: string;
    phone: string;
  };
  /** @deprecated Legacy snapshots */
  customerName?: string;
  loanCode: string;
  bikeModel?: string;
  registrationNumber?: string;
  paidAmount: number;
  discountAmount: number;
  paymentMethod: string;
  repaymentMethod: string;
  cashierName: string;
  installmentNumberLabel?: string;
  nextDueDate?: string;
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

export interface LoanReleaseDocumentSnapshot {
  kind: 'LOAN_RELEASE';
  releaseNoteNumber: string;
  releaseDate: string;
  customer: DocumentPartySnapshot;
  loanCode: string;
  principalAmount: number;
  releasedBy: string;
  remarks: string;
}

export interface CashSaleDocumentSnapshot {
  kind: 'CASH_SALE';
  soldDate: string;
  bike: DocumentBikeSnapshot;
  /** Commercial cash sale (fully settled) */
  sellingPrice?: number;
  discountAmount?: number;
  additionalCharges?: number;
  finalAmount?: number;
  paymentMethod?: string;
  notes?: string;
  customer?: DocumentPartySnapshot;
  soldBy?: string;
  createdBy?: string;
  /** @deprecated Legacy snapshots — use finalAmount + customer */
  soldPrice?: number;
  repairCost?: number;
  otherCost?: number;
  buyerNote?: string;
}

export type DocumentMetadataSnapshot =
  | LoanCreationDocumentSnapshot
  | LoanReleaseDocumentSnapshot
  | PaymentReceiptDocumentSnapshot
  | CashSaleDocumentSnapshot;
