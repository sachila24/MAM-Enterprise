import { generateDocumentNumber } from './documentNumber';
import {
  buildCashSaleSnapshot,
  buildLoanCreationSnapshot,
  buildLoanReleaseSnapshot,
  buildPaymentReceiptSnapshot,
} from './snapshots';
import type { DocumentPartySnapshot, LoanReleaseDocumentSnapshot } from './types';
import { generateId } from '../local-db/localDb';
import type { DbDocument, MamDemoDb } from '../local-db/types';
import type {
  FixedInstallmentReceiptBreakdown,
  InterestOnlyReceiptBreakdown,
} from '../finance/receipt';

function pushDocument(
  db: MamDemoDb,
  row: Omit<DbDocument, 'id' | 'created_at' | 'locked' | 'print_count' | 'status'>
): DbDocument {
  const doc: DbDocument = {
    id: generateId(),
    created_at: new Date().toISOString(),
    locked: true,
    print_count: 0,
    status: 'ISSUED',
    ...row,
  };
  if (!db.documents) db.documents = [];
  db.documents.push(doc);
  return doc;
}

/** Document only — does not create ledger rows or payments. */
export function createLoanReleaseDocument(
  db: MamDemoDb,
  loanId: string,
  options?: { releasedBy?: string; remarks?: string; createdBy?: string }
): DbDocument {
  const loan = db.loans.find((l) => l.id === loanId);
  if (!loan) throw new Error('Loan not found for release document');

  const existing = db.documents?.find(
    (d) => d.loan_id === loanId && d.document_type === 'LOAN_RELEASE'
  );
  if (existing) return existing;

  const documentNumber = generateDocumentNumber('LOAN_RELEASE', db.counters);
  const snapshot: LoanReleaseDocumentSnapshot = {
    ...buildLoanReleaseSnapshot(db, loan, options),
    releaseNoteNumber: documentNumber,
  };

  return pushDocument(db, {
    document_number: documentNumber,
    document_type: 'LOAN_RELEASE',
    loan_id: loanId,
    customer_id: loan.customer_id,
    created_by: options?.createdBy ?? db.profiles[0]?.id,
    total_amount: snapshot.principalAmount,
    metadata_json: snapshot,
  });
}

export function createLoanCreationDocument(
  db: MamDemoDb,
  loanId: string,
  options?: { downPayment?: number; createdBy?: string }
): DbDocument {
  const loan = db.loans.find((l) => l.id === loanId);
  if (!loan) throw new Error('Loan not found for document');

  const existing = db.documents?.find(
    (d) => d.loan_id === loanId && d.document_type === 'LOAN_CREATION'
  );
  if (existing) return existing;

  const snapshot = buildLoanCreationSnapshot(db, loan, {
    downPayment: options?.downPayment,
  });
  const documentNumber = generateDocumentNumber('LOAN_CREATION', db.counters);

  return pushDocument(db, {
    document_number: documentNumber,
    document_type: 'LOAN_CREATION',
    loan_id: loanId,
    customer_id: loan.customer_id,
    bike_id: loan.bike_id,
    created_by: options?.createdBy ?? db.profiles[0]?.id,
    total_amount: snapshot.totalPayable,
    metadata_json: snapshot,
  });
}

export function createPaymentReceiptDocument(
  db: MamDemoDb,
  paymentId: string,
  receiptBreakdown:
    | FixedInstallmentReceiptBreakdown
    | InterestOnlyReceiptBreakdown
): DbDocument {
  const payment = db.loan_payments.find((p) => p.id === paymentId);
  if (!payment) throw new Error('Payment not found for document');

  const existing = db.documents?.find(
    (d) => d.payment_id === paymentId && d.document_type === 'PAYMENT_RECEIPT'
  );
  if (existing) return existing;

  const snapshot = buildPaymentReceiptSnapshot(db, paymentId, receiptBreakdown);
  const documentNumber = generateDocumentNumber('PAYMENT_RECEIPT', db.counters);

  return pushDocument(db, {
    document_number: documentNumber,
    document_type: 'PAYMENT_RECEIPT',
    loan_id: payment.loan_id,
    payment_id: paymentId,
    customer_id: payment.customer_id,
    created_by: db.profiles[0]?.id,
    total_amount: payment.amount,
    metadata_json: snapshot,
  });
}

export function createCashSaleDocument(
  db: MamDemoDb,
  bikeId: string,
  input: {
    soldDate: string;
    sellingPrice: number;
    discountAmount: number;
    additionalCharges: number;
    finalAmount: number;
    paymentMethod: string;
    notes?: string;
    customer: DocumentPartySnapshot;
    customerId?: string;
    createdBy?: string;
    soldBy?: string;
  }
): DbDocument {
  const existingCashSale = db.documents?.find(
    (d) => d.bike_id === bikeId && d.document_type === 'CASH_SALE'
  );
  if (existingCashSale) return existingCashSale;

  const existing = db.documents?.find(
    (d) =>
      d.bike_id === bikeId &&
      d.document_type === 'CASH_SALE' &&
      d.metadata_json &&
      (d.metadata_json as { soldDate?: string }).soldDate === input.soldDate
  );
  if (existing) return existing;

  const officer =
    input.soldBy ??
    db.profiles.find((p) => p.id === input.createdBy)?.full_name?.trim() ??
    db.profiles[0]?.full_name?.trim() ??
    'Staff';

  const snapshot = buildCashSaleSnapshot(db, bikeId, {
    soldDate: input.soldDate,
    sellingPrice: input.sellingPrice,
    discountAmount: input.discountAmount,
    additionalCharges: input.additionalCharges,
    finalAmount: input.finalAmount,
    paymentMethod: input.paymentMethod,
    notes: input.notes,
    customer: input.customer,
    soldBy: officer,
    createdBy: officer,
  });
  const documentNumber = generateDocumentNumber('CASH_SALE', db.counters);

  return pushDocument(db, {
    document_number: documentNumber,
    document_type: 'CASH_SALE',
    bike_id: bikeId,
    customer_id: input.customerId,
    created_by: input.createdBy ?? db.profiles[0]?.id,
    total_amount: input.finalAmount,
    metadata_json: snapshot,
  });
}

export function findLoanCreationDocument(
  db: MamDemoDb,
  loanId: string
): DbDocument | undefined {
  return db.documents?.find(
    (d) => d.loan_id === loanId && d.document_type === 'LOAN_CREATION'
  );
}

export function findLoanReleaseDocument(
  db: MamDemoDb,
  loanId: string
): DbDocument | undefined {
  return db.documents?.find(
    (d) => d.loan_id === loanId && d.document_type === 'LOAN_RELEASE'
  );
}

export function findPaymentReceiptDocument(
  db: MamDemoDb,
  paymentId: string
): DbDocument | undefined {
  return db.documents?.find(
    (d) => d.payment_id === paymentId && d.document_type === 'PAYMENT_RECEIPT'
  );
}

export function findCashSaleDocumentForBike(
  db: MamDemoDb,
  bikeId: string
): DbDocument | undefined {
  const docs = (db.documents ?? []).filter(
    (d) => d.bike_id === bikeId && d.document_type === 'CASH_SALE'
  );
  return docs.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];
}
