import { useEffect, useMemo, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, PrinterIcon } from 'lucide-react';
import { CashSaleInvoicePrint } from '../../components/documents/CashSaleInvoicePrint';
import { LoanInvoicePrint } from '../../components/documents/LoanInvoicePrint';
import { PaymentReceiptDocumentPrint } from '../../components/documents/PaymentReceiptDocumentPrint';
import { EmptyState } from '../../components/ui/EmptyState';
import { readDocumentSnapshot } from '../../lib/documents/snapshots';
import type {
  CashSaleDocumentSnapshot,
  LoanCreationDocumentSnapshot,
  PaymentReceiptDocumentSnapshot,
} from '../../lib/documents/types';
import { getDocument } from '../../lib/local-db/repositories/documentsRepo';
import { incrementDocumentPrintCount } from '../../lib/local-db/repositories/documentsRepo';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import { useT } from '../../i18n/I18nProvider';
import { getDocumentLabel } from '../../lib/i18n/documentLabels';

function handlePrint(documentId: string) {
  incrementDocumentPrintCount(documentId);
  window.print();
}

export function DocumentView() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const db = useDemoDb();
  const { language } = useT();

  const doc = id ? getDocument(id, db) : undefined;

  const snapshot = useMemo(() => {
    if (!doc) return null;
    try {
      return readDocumentSnapshot(doc);
    } catch {
      return null;
    }
  }, [doc]);

  useEffect(() => {
    if (!doc || !searchParams.get('print')) return;
    const timer = window.setTimeout(() => {
      handlePrint(doc.id);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [doc, searchParams]);

  if (!doc || !snapshot) {
    return (
      <div className="max-w-lg mx-auto pt-12">
        <EmptyState
          title="Document not found"
          description="This invoice or receipt may have been removed."
        />
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-brand-600">
          {getDocumentLabel('back', language)}
        </Link>
      </div>
    );
  }

  const backHref =
    doc.loan_id
      ? `/loans/${doc.loan_id}`
      : doc.bike_id
        ? `/bikes/${doc.bike_id}`
        : '/documents';

  const printLabel = getDocumentLabel('printDocument', language);

  let body: ReactNode;
  if (snapshot.kind === 'LOAN_CREATION') {
    body = (
      <LoanInvoicePrint
        documentNumber={doc.document_number}
        createdAt={doc.created_at}
        snapshot={snapshot as LoanCreationDocumentSnapshot}
        language={language}
      />
    );
  } else if (snapshot.kind === 'PAYMENT_RECEIPT') {
    body = (
      <PaymentReceiptDocumentPrint
        documentNumber={doc.document_number}
        createdAt={doc.created_at}
        snapshot={snapshot as PaymentReceiptDocumentSnapshot}
        language={language}
      />
    );
  } else {
    body = (
      <CashSaleInvoicePrint
        documentNumber={doc.document_number}
        createdAt={doc.created_at}
        snapshot={snapshot as CashSaleDocumentSnapshot}
        language={language}
      />
    );
  }

  return (
    <div className="document-view-page pb-16">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigate(backHref)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {getDocumentLabel('back', language)}
        </button>
        <button
          type="button"
          onClick={() => handlePrint(doc.id)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
        >
          <PrinterIcon className="h-4 w-4" />
          {printLabel}
        </button>
      </div>

      <div className="mx-auto max-w-[210mm] bg-white shadow-sm ring-1 ring-neutral-200 p-4 print:shadow-none print:ring-0">
        {body}
      </div>
    </div>
  );
}
