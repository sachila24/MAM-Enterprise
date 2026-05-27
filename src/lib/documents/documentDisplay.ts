import type { DisplayMode } from '../i18n/simpleLabels';
import { getLabel } from '../i18n/simpleLabels';
import type { DbDocument, MamDemoDb } from '../local-db/types';
import { readDocumentSnapshot } from './snapshots';
import {
  type DocumentPrintStatus,
  type RegistryDocumentType,
  toRegistryDocumentType,
} from './documentRegistryTypes';

export interface DocumentListRow {
  id: string;
  documentNumber: string;
  registryType: RegistryDocumentType;
  typeLabel: string;
  customerName: string;
  customerNic: string;
  loanNumber: string;
  createdAt: string;
  totalAmount: number;
  printCount: number;
  printStatus: DocumentPrintStatus;
  createdByName: string;
  searchText: string;
}

function registryTypeLabel(
  type: RegistryDocumentType,
  mode: DisplayMode
): string {
  const keyMap: Record<RegistryDocumentType, Parameters<typeof getLabel>[0]> = {
    LOAN_INVOICE: 'docTypeLoanInvoice',
    PAYMENT_RECEIPT: 'docTypePaymentReceipt',
    CASH_SALE: 'docTypeCashSale',
    SETTLEMENT: 'docTypeSettlement',
    AGREEMENT: 'docTypeAgreement',
  };
  return getLabel(keyMap[type], mode);
}

function resolveCreatedByName(
  db: MamDemoDb,
  profileId?: string
): string {
  if (!profileId) return '—';
  const profile = db.profiles.find((p) => p.id === profileId);
  return profile?.full_name?.trim() || profile?.email || '—';
}

function snapshotFields(doc: DbDocument): {
  customerName: string;
  customerNic: string;
  loanNumber: string;
} {
  try {
    const snap = readDocumentSnapshot(doc);
    if (snap.kind === 'LOAN_CREATION') {
      return {
        customerName: snap.customer.name,
        customerNic: snap.customer.nic,
        loanNumber: snap.loanCode,
      };
    }
    if (snap.kind === 'LOAN_RELEASE') {
      return {
        customerName: snap.customer.name,
        customerNic: snap.customer.nic,
        loanNumber: snap.loanCode,
      };
    }
    if (snap.kind === 'PAYMENT_RECEIPT') {
      return {
        customerName: snap.customerName,
        customerNic: '—',
        loanNumber: snap.loanCode,
      };
    }
    return {
      customerName: snap.buyerNote || '—',
      customerNic: '—',
      loanNumber: '—',
    };
  } catch {
    return { customerName: '—', customerNic: '—', loanNumber: '—' };
  }
}

export function enrichDocumentForList(
  doc: DbDocument,
  db: MamDemoDb,
  mode: DisplayMode = 'both'
): DocumentListRow {
  const fields = snapshotFields(doc);
  const customer = doc.customer_id
    ? db.customers.find((c) => c.id === doc.customer_id)
    : undefined;
  const nic =
    fields.customerNic !== '—'
      ? fields.customerNic
      : customer?.nic ?? '—';
  const loan = doc.loan_id
    ? db.loans.find((l) => l.id === doc.loan_id)
    : undefined;
  const loanNumber =
    fields.loanNumber !== '—'
      ? fields.loanNumber
      : loan?.loan_code ?? '—';

  const registryType = toRegistryDocumentType(doc.document_type);
  const searchText = [
    doc.document_number,
    fields.customerName,
    nic,
    loanNumber,
  ]
    .join(' ')
    .toLowerCase();

  return {
    id: doc.id,
    documentNumber: doc.document_number,
    registryType,
    typeLabel: registryTypeLabel(registryType, mode),
    customerName: fields.customerName,
    customerNic: nic,
    loanNumber,
    createdAt: doc.created_at,
    totalAmount: doc.total_amount,
    printCount: doc.print_count,
    printStatus: doc.print_count === 0 ? 'ORIGINAL' : 'REPRINTED',
    createdByName: resolveCreatedByName(db, doc.created_by),
    searchText,
  };
}

export function printStatusLabel(
  status: DocumentPrintStatus,
  mode: DisplayMode = 'both'
): string {
  return status === 'ORIGINAL'
    ? getLabel('docStatusOriginal', mode)
    : getLabel('docStatusReprinted', mode);
}
