import { formatLKR, formatDate } from '../../lib/format';
import { getDocumentLabels } from '../../lib/i18n/documentLabels';
import type { CashSaleDocumentSnapshot } from '../../lib/documents/types';
import type { DisplayMode } from '../../lib/i18n/simpleLabels';

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="doc-field">
      <span className="doc-field-label">{label}</span>
      <span className="doc-field-value">{value}</span>
    </div>
  );
}

export interface CashSaleInvoicePrintProps {
  documentNumber: string;
  createdAt: string;
  snapshot: CashSaleDocumentSnapshot;
  language?: DisplayMode;
}

export function CashSaleInvoicePrint({
  documentNumber,
  createdAt,
  snapshot,
  language = 'both',
}: CashSaleInvoicePrintProps) {
  const L = getDocumentLabels(language);

  return (
    <div id="document-print-area" className="receipt-document doc-invoice">
      <div className="receipt-sheet">
        <header className="receipt-section receipt-header">
          <h1 className="receipt-company-name">{L.companyName}</h1>
          <p className="receipt-company-meta">No.47, Galmaduwa, Mahailuppallama</p>
          <h2 className="doc-title">{L.cashSaleTitle}</h2>
          <div className="doc-meta-row">
            <p>
              <strong>{L.invoiceNumber}:</strong> {documentNumber}
            </p>
            <p>
              <strong>{L.createdDate}:</strong> {formatDate(createdAt)}
            </p>
            <p>
              <strong>{L.soldDate}:</strong> {formatDate(snapshot.soldDate)}
            </p>
          </div>
          <p className="doc-locked-banner">{L.lockedNotice}</p>
        </header>

        <div className="receipt-body">
          <h3 className="doc-section-title">{L.bikeDetails}</h3>
          <div className="doc-grid-2">
            <Field label={L.bikeModel} value={snapshot.bike.model} />
            <Field label={L.brand} value={snapshot.bike.brand} />
            <Field label={L.color} value={snapshot.bike.color} />
            <Field label={L.chassisNo} value={snapshot.bike.chassisNo} />
            <Field label={L.engineNo} value={snapshot.bike.engineNo} />
          </div>

          <h3 className="doc-section-title">{L.financeDetails}</h3>
          <div className="doc-grid-2">
            <Field label={L.salePrice} value={formatLKR(snapshot.soldPrice)} />
            <Field label="Repair" value={formatLKR(snapshot.repairCost)} />
            <Field label="Other cost" value={formatLKR(snapshot.otherCost)} />
          </div>
          <p className="doc-locked-banner">{snapshot.buyerNote}</p>

          <div className="doc-signatures">
            <div className="doc-sig-line">{L.customerSignature}</div>
            <div className="doc-sig-line">{L.authorizedOfficer}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
