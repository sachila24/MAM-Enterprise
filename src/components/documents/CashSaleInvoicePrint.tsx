import { formatLKR, formatDate, formatEnum } from '../../lib/format';
import { getDocumentLabels } from '../../lib/i18n/documentLabels';
import { isLegacyCashSaleSnapshot } from '../../lib/documents/snapshots';
import type { CashSaleDocumentSnapshot } from '../../lib/documents/types';
import type { DisplayMode } from '../../lib/i18n/simpleLabels';
import { formatDocumentBikeModel } from '../../lib/display/bikeDisplay';
import { MamDocumentBottomSection } from '../branding/MamDocumentBottomSection';
import { MamDocumentHeader } from '../branding/MamLogo';

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
  const legacy = isLegacyCashSaleSnapshot(snapshot);
  const yearDisplay =
    snapshot.bike.year && snapshot.bike.year > 0
      ? String(snapshot.bike.year)
      : '';

  const finalAmount = legacy
    ? (snapshot.soldPrice ?? 0)
    : (snapshot.finalAmount ?? 0);

  return (
    <div
      id="document-print-area"
      className="receipt-document mam-bill cash-sale-print-b5"
    >
      <div className="receipt-sheet mam-bill-sheet">
        <MamDocumentHeader title={L.cashSaleTitle} logoSize={68}>
          <div className="mam-cash-sale-meta" aria-label="Invoice metadata">
            <div className="mam-cash-sale-meta-item">
              <span className="mam-cash-sale-meta-label">{L.invoiceNumber}</span>
              <strong>{documentNumber}</strong>
            </div>
            <div className="mam-cash-sale-meta-item">
              <span className="mam-cash-sale-meta-label">{L.createdDate}</span>
              <strong>{formatDate(createdAt)}</strong>
            </div>
            <div className="mam-cash-sale-meta-item">
              <span className="mam-cash-sale-meta-label">{L.soldDate}</span>
              <strong>{formatDate(snapshot.soldDate)}</strong>
            </div>
          </div>
        </MamDocumentHeader>

        <div className="receipt-body mam-bill-body">
          {snapshot.customer && (
            <section className="mam-bill-section mam-cash-sale-section">
              <h2 className="mam-bill-section-heading">{L.customerDetails}</h2>
              <div className="mam-bill-detail-block">
                <DetailRow label={L.customerName} value={snapshot.customer.name} />
                <DetailRow label={L.nic} value={snapshot.customer.nic} />
                <DetailRow label={L.phone} value={snapshot.customer.phone} />
                <DetailRow label={L.address} value={snapshot.customer.address} />
              </div>
            </section>
          )}

          {!snapshot.customer && snapshot.buyerNote?.trim() && (
            <section className="mam-bill-section mam-cash-sale-section">
              <h2 className="mam-bill-section-heading">{L.customerDetails}</h2>
              <div className="mam-bill-detail-block">
                <DetailRow label={L.customerName} value={snapshot.buyerNote} />
              </div>
            </section>
          )}

          <section className="mam-bill-section mam-cash-sale-section">
            <h2 className="mam-bill-section-heading">{L.bikeDetails}</h2>
            <div className="mam-bill-detail-block">
              <DetailRow
                label={L.bikeModel}
                value={formatDocumentBikeModel(
                  snapshot.bike.brand,
                  snapshot.bike.model
                )}
              />
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

          <section className="mam-bill-section mam-bill-finance mam-cash-sale-section">
            <h2 className="mam-bill-section-heading">{L.cashSaleTransactionDetails}</h2>
            <div className="mam-cash-sale-finance-panel">
              <div className="mam-bill-finance-box mam-cash-sale-lines">
                {legacy ? (
                  <>
                    <BillRow
                      label={L.salePrice}
                      value={formatLKR(snapshot.soldPrice ?? 0)}
                    />
                    <BillRow
                      label={L.repairCost}
                      value={formatLKR(snapshot.repairCost ?? 0)}
                    />
                    <BillRow
                      label={L.otherCost}
                      value={formatLKR(snapshot.otherCost ?? 0)}
                    />
                  </>
                ) : (
                  <>
                    <BillRow
                      label={L.salePrice}
                      value={formatLKR(snapshot.sellingPrice ?? 0)}
                    />
                    {(snapshot.discountAmount ?? 0) > 0 && (
                      <BillRow
                        label={L.discount}
                        value={`−${formatLKR(snapshot.discountAmount ?? 0)}`}
                      />
                    )}
                    {(snapshot.additionalCharges ?? 0) > 0 && (
                      <BillRow
                        label={L.additionalCharges}
                        value={formatLKR(snapshot.additionalCharges ?? 0)}
                      />
                    )}
                  </>
                )}
              </div>

              <div className="mam-cash-sale-totals-box">
                <div className="mam-cash-sale-total-row">
                  <span className="mam-cash-sale-total-label">
                    {legacy ? L.salePrice : L.finalPaidAmount}
                  </span>
                  <span className="mam-cash-sale-total-value">
                    {formatLKR(finalAmount)}
                  </span>
                </div>
              </div>

              {!legacy && snapshot.paymentMethod && (
                <div className="mam-bill-detail-block mam-cash-sale-payment-block">
                  <DetailRow
                    label={L.paymentMethod}
                    value={formatEnum(snapshot.paymentMethod, language)}
                  />
                  {snapshot.soldBy && (
                    <DetailRow label={L.soldBy} value={snapshot.soldBy} />
                  )}
                  {snapshot.createdBy &&
                    snapshot.createdBy !== snapshot.soldBy && (
                      <DetailRow
                        label={L.createdBy}
                        value={snapshot.createdBy}
                      />
                    )}
                </div>
              )}
            </div>
          </section>
        </div>

        <MamDocumentBottomSection
          documentLegalNotice={L.documentLegalNotice}
          customerSignature={L.customerSignature}
          authorizedOfficer={L.authorizedOfficer}
          variant="two"
        />
      </div>
    </div>
  );
}
