import { formatLKR, formatDate, formatEnum } from '../../lib/format';
import { getDocumentLabels } from '../../lib/i18n/documentLabels';
import type { BikePurchaseDocumentSnapshot } from '../../lib/documents/types';
import type { DisplayMode } from '../../lib/i18n/simpleLabels';
import { MamDocumentHeader } from '../branding/MamLogo';
import { MamDocumentBottomSection } from '../branding/MamDocumentBottomSection';

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

export interface BikePurchaseReceiptPrintProps {
  documentNumber: string;
  createdAt: string;
  snapshot: BikePurchaseDocumentSnapshot;
  language?: DisplayMode;
}

export function BikePurchaseReceiptPrint({
  documentNumber,
  createdAt,
  snapshot,
  language = 'both',
}: BikePurchaseReceiptPrintProps) {
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
        <MamDocumentHeader title={L.bikePurchaseTitle} logoSize={68}>
          <div className="mam-cash-sale-meta" aria-label="Receipt metadata">
            <div className="mam-cash-sale-meta-item">
              <span className="mam-cash-sale-meta-label">{L.receiptNumber}</span>
              <strong>{documentNumber}</strong>
            </div>
            <div className="mam-cash-sale-meta-item">
              <span className="mam-cash-sale-meta-label">{L.createdDate}</span>
              <strong>{formatDate(createdAt)}</strong>
            </div>
            <div className="mam-cash-sale-meta-item">
              <span className="mam-cash-sale-meta-label">{L.purchaseDateLabel}</span>
              <strong>{formatDate(snapshot.purchaseDate)}</strong>
            </div>
          </div>
        </MamDocumentHeader>

        <div className="receipt-body mam-bill-body">
          <section className="mam-bill-section mam-cash-sale-section">
            <h2 className="mam-bill-section-heading">{L.sellerDetails}</h2>
            <div className="mam-bill-detail-block">
              <DetailRow label={L.customerName} value={snapshot.seller.name} />
              {snapshot.seller.customerCode && (
                <DetailRow
                  label={L.customerCode}
                  value={snapshot.seller.customerCode}
                />
              )}
              <DetailRow label={L.nic} value={snapshot.seller.nic} />
              <DetailRow label={L.phone} value={snapshot.seller.phone} />
              <DetailRow label={L.address} value={snapshot.seller.address} />
            </div>
          </section>

          <section className="mam-bill-section mam-cash-sale-section">
            <h2 className="mam-bill-section-heading">{L.bikeDetails}</h2>
            <div className="mam-bill-detail-block">
              <DetailRow
                label={L.registrationNumber}
                value={snapshot.bike.registrationNo}
              />
              <DetailRow label={L.bikeModel} value={snapshot.bike.model} />
              <DetailRow label={L.chassisNo} value={snapshot.bike.chassisNo} />
              <DetailRow label={L.engineNo} value={snapshot.bike.engineNo} />
              <DetailRow label={L.color} value={snapshot.bike.color} />
              <DetailRow label={L.year} value={yearDisplay} />
            </div>
          </section>

          <section className="mam-bill-section mam-bill-finance mam-cash-sale-section">
            <h2 className="mam-bill-section-heading">
              {L.purchaseFinancialDetails}
            </h2>
            <div className="mam-cash-sale-finance-panel">
              <div className="mam-bill-finance-box mam-cash-sale-lines">
                <BillRow
                  label={L.purchasePrice}
                  value={formatLKR(snapshot.purchasePrice)}
                />
                {(snapshot.repairCost ?? 0) > 0 && (
                  <BillRow
                    label={L.repairCostEstimate}
                    value={formatLKR(snapshot.repairCost)}
                  />
                )}
                {(snapshot.transportCost ?? 0) > 0 && (
                  <BillRow
                    label={L.transportCost}
                    value={formatLKR(snapshot.transportCost)}
                  />
                )}
                {(snapshot.documentCost ?? 0) > 0 && (
                  <BillRow
                    label={L.documentCost}
                    value={formatLKR(snapshot.documentCost)}
                  />
                )}
                {(snapshot.otherCost ?? 0) > 0 && (
                  <BillRow
                    label={L.otherCost}
                    value={formatLKR(snapshot.otherCost)}
                  />
                )}
              </div>

              <div className="mam-cash-sale-totals-box">
                <div className="mam-cash-sale-total-row">
                  <span className="mam-cash-sale-total-label">
                    {L.totalPaidAmount}
                  </span>
                  <span className="mam-cash-sale-total-value">
                    {formatLKR(snapshot.totalPaidAmount)}
                  </span>
                </div>
              </div>

              <div className="mam-bill-detail-block mam-cash-sale-payment-block">
                <DetailRow
                  label={L.paymentMethod}
                  value={formatEnum(snapshot.paymentMethod, language)}
                />
                {snapshot.paymentReference?.trim() && (
                  <DetailRow
                    label={L.paymentReference}
                    value={snapshot.paymentReference}
                  />
                )}
                <DetailRow label={L.handledBy} value={snapshot.handledBy} />
                {snapshot.paymentNotes?.trim() && (
                  <DetailRow label={L.remarks} value={snapshot.paymentNotes} />
                )}
                {snapshot.purchaseNotes?.trim() && (
                  <DetailRow
                    label={L.purchaseNotes}
                    value={snapshot.purchaseNotes}
                  />
                )}
              </div>
            </div>
          </section>
        </div>

        <MamDocumentBottomSection
          documentLegalNotice={L.bikePurchaseOwnershipNotice}
          customerSignature={L.sellerSignature}
          authorizedOfficer={L.showroomSignature}
          variant="two"
        />
      </div>
    </div>
  );
}
