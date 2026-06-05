import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  PrinterIcon,
  PlusIcon,
  ArrowLeftIcon,
} from 'lucide-react';
import type {
  FixedInstallmentReceiptBreakdown,
  InterestOnlyReceiptBreakdown,
} from '../../lib/finance/receipt';
import type { AllocationDisplayRow } from '../../lib/finance/allocationDisplay';
import type { RepaymentMethod } from '../../types/loan';
import { PaymentReceiptDocumentPrint } from '../../components/documents/PaymentReceiptDocumentPrint';
import { findPaymentReceiptDocument } from '../../lib/documents/documentService';
import { readDocumentSnapshot } from '../../lib/documents/snapshots';
import type { PaymentReceiptDocumentSnapshot } from '../../lib/documents/types';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import { getDocumentLabel } from '../../lib/i18n/documentLabels';
import { useT } from '../../i18n/I18nProvider';

export interface PaymentSuccessState {
  loanCode: string;
  loanId: string;
  customerName: string;
  customerCode?: string;
  amount: number;
  discountAmount?: number;
  paymentMethod: string;
  paymentDate: string;
  repaymentMethod: RepaymentMethod;
  receipt: InterestOnlyReceiptBreakdown | FixedInstallmentReceiptBreakdown;
  allocationRows?: AllocationDisplayRow[];
  supabasePending?: boolean;
  receiptNumber?: string;
  paymentId?: string;
}

function handlePrint(): void {
  window.print();
}

export function PaymentSuccess() {
  const { t, language } = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const db = useDemoDb();
  const state = location.state as PaymentSuccessState | null;

  if (!state?.receipt) {
    return (
      <div className="max-w-lg mx-auto pt-12 text-center no-print">
        <p className="text-neutral-600 mb-4">{t('noPaymentDetails')}</p>
        <Link
          to="/payments/new"
          className="text-brand-600 font-semibold hover:text-brand-500"
        >
          {t('recordPayment')}
        </Link>
      </div>
    );
  }

  const receiptNo = state.receiptNumber ?? '—';
  const officialDoc = state.paymentId
    ? findPaymentReceiptDocument(db, state.paymentId)
    : undefined;
  const officialSnapshot =
    officialDoc && officialDoc.metadata_json
      ? (readDocumentSnapshot(officialDoc) as PaymentReceiptDocumentSnapshot)
      : undefined;

  return (
    <div className="payment-success-page pb-16 print:pb-0 print:m-0">
      <div className="no-print mb-4">
        <button
          type="button"
          onClick={() => navigate('/payments')}
          className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t('backToPayments')}
        </button>
      </div>

      <div className="no-print mb-6 flex items-start gap-3 rounded-lg border border-success-200 bg-success-50 px-4 py-3">
        <CheckCircleIcon
          className="h-6 w-6 shrink-0 text-success-600"
          aria-hidden
        />
        <div>
          <p className="font-semibold text-success-900">
            {t('paymentRecordedTitle')}
          </p>
          <p className="mt-0.5 text-sm text-success-800 font-mono tabular-nums">
            {receiptNo}
          </p>
          {!state.supabasePending && (
            <p className="mt-1 text-xs text-success-700">
              {t('misc.savedToLocalDemo')}
            </p>
          )}
        </div>
      </div>

      {officialDoc && officialSnapshot?.kind === 'PAYMENT_RECEIPT' ? (
        <div className="mx-auto max-w-[176mm] print:max-w-none">
          <PaymentReceiptDocumentPrint
            documentNumber={officialDoc.document_number}
            createdAt={officialDoc.created_at}
            snapshot={officialSnapshot}
            language={language}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-warning-300 bg-warning-50 p-4 text-sm text-warning-900">
          {t('documentNotFoundHint')}
        </div>
      )}

      <div className="no-print mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          <PrinterIcon className="h-4 w-4" />
          {t('printReceipt')}
        </button>
        {officialDoc && (
          <button
            type="button"
            onClick={() => navigate(`/documents/${officialDoc.id}`)}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-300 hover:bg-brand-50"
          >
            {getDocumentLabel('viewInvoice', language)}
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate(`/loans/${state.loanId}`)}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-neutral-900 ring-1 ring-neutral-300 hover:bg-neutral-50"
        >
          {t('viewLoan')}
        </button>
        <button
          type="button"
          onClick={() => navigate('/payments/new')}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
        >
          <PlusIcon className="h-4 w-4" />
          {t('recordAnotherPayment')}
        </button>
        <Link
          to={`/loans/${state.loanId}`}
          className="inline-flex items-center text-sm font-semibold text-brand-600 hover:text-brand-500"
        >
          {t('viewFullLoanSchedule')}
        </Link>
      </div>
    </div>
  );
}
