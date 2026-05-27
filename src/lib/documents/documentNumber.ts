import type { DocumentType } from './types';

const PREFIX: Record<DocumentType, string> = {
  LOAN_CREATION: 'LN',
  LOAN_RELEASE: 'RLN',
  PAYMENT_RECEIPT: 'RCPT',
  CASH_SALE: 'CS',
};

/** Sequential document numbers: LN-2026-000001, RCPT-2026-000001, CS-2026-000001 */
export function generateDocumentNumber(
  documentType: DocumentType,
  counters: Record<string, number>,
  year: number = new Date().getFullYear()
): string {
  const prefix = PREFIX[documentType];
  const counterKey = `DOC-${prefix}-${year}`;
  const next = (counters[counterKey] ?? 0) + 1;
  counters[counterKey] = next;
  return `${prefix}-${year}-${String(next).padStart(6, '0')}`;
}
