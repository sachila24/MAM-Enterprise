import { getDb, saveDb } from '../localDb';
import type { DbDocument, DocumentType, MamDemoDb } from '../types';

export function getDocument(
  id: string,
  db: MamDemoDb = getDb()
): DbDocument | undefined {
  return db.documents?.find((d) => d.id === id);
}

export function listDocuments(db: MamDemoDb = getDb()): DbDocument[] {
  return [...(db.documents ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function findDocumentsByLoan(
  loanId: string,
  documentType?: DocumentType,
  db: MamDemoDb = getDb()
): DbDocument[] {
  return (db.documents ?? []).filter(
    (d) =>
      d.loan_id === loanId &&
      (documentType ? d.document_type === documentType : true)
  );
}

export function incrementDocumentPrintCount(
  id: string,
  db: MamDemoDb = getDb()
): DbDocument | undefined {
  const row = db.documents?.find((d) => d.id === id);
  if (!row) return undefined;
  row.print_count += 1;
  row.last_printed_at = new Date().toISOString();
  saveDb(db);
  return row;
}

/** Alias for reprint workflow — same storage update as increment. */
export function recordDocumentReprint(
  id: string,
  db: MamDemoDb = getDb()
): DbDocument | undefined {
  return incrementDocumentPrintCount(id, db);
}
