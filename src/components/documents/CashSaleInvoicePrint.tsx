import { formatLKR, formatDate } from '../../lib/format';
import { getDocumentLabels } from '../../lib/i18n/documentLabels';
import type { CashSaleDocumentSnapshot } from '../../lib/documents/types';
import type { DisplayMode } from '../../lib/i18n/simpleLabels';
import { MamDocumentFooter, MamDocumentHeader } from '../branding/MamLogo';

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value?.trim() || value.trim() === '—') return null;
  return (
    <div className="mam-bill-detail-row">
      <span className="mam-bill-detail-label">{label}</span>
      <span className="mam-bill-detail-value">{value.trim()}</span>
    </div>
  );
}

function BillRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mam-bill-row">
      <span className="mam-bill-row-label">{label}</span>
      <span className="mam-bill-row-leader" aria-hidden />
      <span className="mam-bill-row-value">{value}</span>
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
  const yearDisplay =
    snapshot.bike.year && snapshot.bike.year > 0
      ? String(snapshot.bike.year)
      : '';

  return (
    <div
      id="document-print-area"
      className="receipt-document mam-bill cash-sale-print-b5"
    >
      <div className="receipt-sheet mam-bill-sheet">
        <MamDocumentHeader title={L.cashSaleTitle} logoSize={58}>
          <div className="mam-bill-meta">
            <span>
              {L.invoiceNumber}: <strong>{documentNumber}</strong>
            </span>
            <span>
              {L.createdDate}: <strong>{formatDate(createdAt)}</strong>
            </span>
            <span>
              {L.soldDate}: <strong>{formatDate(snapshot.soldDate)}</strong>
            </span>
          </div>
        </MamDocumentHeader>

        <div className="receipt-body mam-bill-body">
          <section className="mam-bill-section">
            <h2 className="mam-bill-section-heading">{L.bikeDetails}</h2>
            <div className="mam-bill-detail-block">
              <DetailRow label={L.bikeModel} value={snapshot.bike.model} />
              <DetailRow
                label={L.registrationNumber}
                value={snapshot.bike.registrationNo}
              />
              <DetailRow label={L.chassisNo} value={snapshot.bike.chassisNo} />
              <DetailRow label={L.engineNo} value={snapshot.bike.engineNo} />
              <DetailRow label={L.color} value={snapshot.bike.color} />
              <DetailRow label={L.year} value={yearDisplay} />
            </div>
          </section>

          <section className="mam-bill-section mam-bill-finance">
            <h2 className="mam-bill-section-heading">{L.financeDetails}</h2>
            <div className="mam-bill-finance-box">
              <BillRow label={L.salePrice} value={formatLKR(snapshot.soldPrice)} />
              <BillRow label={L.repairCost} value={formatLKR(snapshot.repairCost)} />
              <BillRow label={L.otherCost} value={formatLKR(snapshot.otherCost)} />
            </div>
          </section>

          <div className="mam-bill-signatures mam-bill-signatures-two">
            <div className="mam-bill-sig">
              <div className="mam-bill-sig-line" />
              <span>{L.customerSignature}</span>
            </div>
            <div className="mam-bill-sig">
              <div className="mam-bill-sig-line" />
              <span>{L.authorizedOfficer}</span>
            </div>
          </div>
        </div>

        <MamDocumentFooter />
      </div>
    </div>
  );
}
