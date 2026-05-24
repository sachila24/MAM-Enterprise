import { formatLKR, formatDate } from '../../lib/format';
import { getDocumentLabels } from '../../lib/i18n/documentLabels';
import type { PaymentReceiptDocumentSnapshot } from '../../lib/documents/types';
import type { DisplayMode } from '../../lib/i18n/simpleLabels';

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="receipt-row">
      <span className="receipt-label">{label}</span>
      <span className={`receipt-value${bold ? ' receipt-bold' : ''}`}>{value}</span>
    </div>
  );
}

export interface PaymentReceiptDocumentPrintProps {
  documentNumber: string;
  createdAt: string;
  snapshot: PaymentReceiptDocumentSnapshot;
  language?: DisplayMode;
}

export function PaymentReceiptDocumentPrint({
  documentNumber,
  createdAt,
  snapshot,
  language = 'both',
}: PaymentReceiptDocumentPrintProps) {
  const L = getDocumentLabels(language);
  const b = snapshot.appliedBreakdown;

  return (
    <div id="document-print-area" className="receipt-document">
      <div className="receipt-sheet">
        <header className="receipt-section receipt-header">
          <h1 className="receipt-company-name">{L.companyName}</h1>
          <p className="receipt-company-meta">No.47, Galmaduwa, Mahailuppallama</p>
          <h2 className="receipt-title">{L.paymentReceiptTitle}</h2>
          <div className="receipt-meta-block">
            <p className="receipt-receipt-no">
              {L.receiptNumber}: {documentNumber}
            </p>
            <p className="receipt-receipt-no">
              {L.receiptNumber} (payment): {snapshot.receiptNumber}
            </p>
            <p>
              <span>{L.createdDate}:</span> {formatDate(createdAt)}
            </p>
            <p>
              <span>{L.paymentDate}:</span> {formatDate(snapshot.paymentDate)}
            </p>
          </div>
          <p className="doc-locked-banner">{L.lockedNotice}</p>
        </header>

        <div className="receipt-body">
          <section className="receipt-section">
            <Row label={L.customerName} value={snapshot.customerName} />
            <Row label={L.loanNumber} value={snapshot.loanCode} />
            <Row label={L.cashier} value={snapshot.cashierName} />
          </section>

          <hr className="receipt-rule" />

          <section className="receipt-section">
            <Row label={L.paidAmount} value={formatLKR(snapshot.paidAmount)} bold />
            {snapshot.discountAmount > 0 && (
              <Row label={L.discount} value={formatLKR(snapshot.discountAmount)} />
            )}
          </section>

          <hr className="receipt-rule" />

          <section className="receipt-section receipt-insight-section">
            <h3 className="receipt-section-title">{L.appliedBreakdown}</h3>
            <Row label={L.lateFeePaid} value={formatLKR(b.lateFeePaid)} />
            <Row label={L.installmentPaid} value={formatLKR(b.installmentPaid)} />
            {b.interestPaid > 0 && (
              <Row label={L.interestPaid} value={formatLKR(b.interestPaid)} />
            )}
            {b.principalPaid > 0 && (
              <Row label={L.principalPaid} value={formatLKR(b.principalPaid)} />
            )}
            <Row
              label={L.remainingBalance}
              value={formatLKR(b.remainingBalance)}
              bold
            />
          </section>
        </div>
      </div>
    </div>
  );
}
