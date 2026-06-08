import type { DocumentType as StorageDocumentType } from '../local-db/types';

/** Registry / UI document types (future-ready). Storage may use legacy names. */
export type RegistryDocumentType =
  | 'LOAN_INVOICE'
  | 'PAYMENT_RECEIPT'
  | 'CASH_SALE'
  | 'BIKE_PURCHASE'
  | 'SETTLEMENT'
  | 'AGREEMENT';

export type DocumentTypeFilter =
  | 'all'
  | 'loan_invoices'
  | 'payment_receipts'
  | 'cash_sales'
  | 'bike_purchases';

export type DocumentSortOrder = 'newest' | 'oldest';

export type DocumentPrintStatus = 'ORIGINAL' | 'REPRINTED';

const STORAGE_TO_REGISTRY: Record<StorageDocumentType, RegistryDocumentType> = {
  LOAN_CREATION: 'LOAN_INVOICE',
  LOAN_RELEASE: 'SETTLEMENT',
  PAYMENT_RECEIPT: 'PAYMENT_RECEIPT',
  CASH_SALE: 'CASH_SALE',
  BIKE_PURCHASE_RECEIPT: 'BIKE_PURCHASE',
};

const FILTER_TO_STORAGE: Record<
  Exclude<DocumentTypeFilter, 'all'>,
  StorageDocumentType
> = {
  loan_invoices: 'LOAN_CREATION',
  payment_receipts: 'PAYMENT_RECEIPT',
  cash_sales: 'CASH_SALE',
  bike_purchases: 'BIKE_PURCHASE_RECEIPT',
};

export function toRegistryDocumentType(
  storageType: StorageDocumentType
): RegistryDocumentType {
  return STORAGE_TO_REGISTRY[storageType] ?? 'LOAN_INVOICE';
}

export function storageTypesForFilter(
  filter: DocumentTypeFilter
): StorageDocumentType[] | null {
  if (filter === 'all') return null;
  return [FILTER_TO_STORAGE[filter]];
}

export const FUTURE_REGISTRY_TYPES: RegistryDocumentType[] = [
  'LOAN_INVOICE',
  'PAYMENT_RECEIPT',
  'CASH_SALE',
  'BIKE_PURCHASE',
  'SETTLEMENT',
  'AGREEMENT',
];
