import { formatLKR, formatDate } from '../../lib/format';
import { getDocumentLabels } from '../../lib/i18n/documentLabels';
import { lateFeeRuleLabel } from '../../lib/documents/snapshots';
import type { LoanCreationDocumentSnapshot } from '../../lib/documents/types';
import type { DisplayMode } from '../../lib/i18n/simpleLabels';

function BillRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mam-bill-row">
      <span className="mam-bill-row-label">{label}</span>
      <span className="mam-bill-row-leader" aria-hidden />
      <span className="mam-bill-row-value">{value}</span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value?.trim() || value.trim() === '—') return null;
  return (
    <div className="mam-bill-detail-row">
      <span className="mam-bill-detail-label">{label}</span>
      <span className="mam-bill-detail-value">{value.trim()}</span>
    </div>
  );
}

export interface LoanInvoicePrintProps {
  documentNumber: string;
  createdAt: string;
  snapshot: LoanCreationDocumentSnapshot;
  language?: DisplayMode;
}

export function LoanInvoicePrint({
  documentNumber,
  createdAt,
  snapshot,
  language = 'both',
}: LoanInvoicePrintProps) {
  const L = getDocumentLabels(language);

  const initialPaid =
    snapshot.initialPayment ??
    (snapshot.downPayment ?? 0) +
      (snapshot.serviceFee ?? 0) +
      (snapshot.registrationFee ?? 0);
  const netAdvance =
    snapshot.netAdvancePayment ?? snapshot.downPayment ?? 0;

  return (
    <div id="document-print-area" className="receipt-document doc-invoice mam-bill">
      <div className="receipt-sheet mam-bill-sheet">
        <header className="mam-bill-header">
          <h1 className="mam-bill-company">{L.companyName}</h1>
          <p className="mam-bill-company-line">No.47, Galmaduwa, Mahailuppallama</p>
          <p className="mam-bill-company-line">දුරකථන: 071 593 1681 | 071 209 9416</p>
          <p className="mam-bill-title">{L.loanInvoiceTitle}</p>
          <div className="mam-bill-meta">
            <span>
              {L.invoiceNumber}: <strong>{documentNumber}</strong>
            </span>
            <span>
              {L.createdDate}: <strong>{formatDate(createdAt)}</strong>
            </span>
            <span>
              {L.loanNumber}: <strong>{snapshot.loanCode}</strong>
            </span>
          </div>
        </header>

        <div className="receipt-body mam-bill-body">
          <section className="mam-bill-section">
            <h2 className="mam-bill-section-heading">{L.customerDetails}</h2>
            <div className="mam-bill-detail-block">
              <DetailRow label={L.customerName} value={snapshot.customer.name} />
              <DetailRow
                label={L.customerCode}
                value={snapshot.customer.customerCode ?? ''}
              />
              <DetailRow label={L.nic} value={snapshot.customer.nic} />
              <DetailRow label={L.address} value={snapshot.customer.address} />
              <DetailRow label={L.phone} value={snapshot.customer.phone} />
            </div>
          </section>

          {snapshot.bike && (
            <section className="mam-bill-section">
              <h2 className="mam-bill-section-heading">{L.bikeDetails}</h2>
              <div className="mam-bill-detail-block">
                <DetailRow
                  label={L.bikeModel}
                  value={`${snapshot.bike.brand} ${snapshot.bike.model}`.trim()}
                />
                <DetailRow label={L.color} value={snapshot.bike.color} />
                <DetailRow label={L.chassisNo} value={snapshot.bike.chassisNo} />
                <DetailRow label={L.engineNo} value={snapshot.bike.engineNo} />
              </div>
            </section>
          )}

          <section className="mam-bill-section mam-bill-finance">
            <h2 className="mam-bill-section-heading">{L.financeDetails}</h2>
            <div className="mam-bill-finance-box">
              <BillRow label={L.cashPrice} value={formatLKR(snapshot.cashPrice)} />
              <BillRow label={L.initialPayment} value={formatLKR(initialPaid)} />
              <BillRow
                label={L.serviceFee}
                value={formatLKR(snapshot.serviceFee ?? 0)}
              />
              <BillRow
                label={L.registrationFee}
                value={formatLKR(snapshot.registrationFee ?? 0)}
              />
              <BillRow label={L.netAdvancePayment} value={formatLKR(netAdvance)} />
              <BillRow
                label={L.financeAmount}
                value={formatLKR(snapshot.financeAmount)}
              />
              <BillRow
                label={L.interestAmount}
                value={formatLKR(snapshot.interestAmount)}
              />
              <BillRow
                label={L.installmentCount}
                value={String(snapshot.installmentCount)}
              />
              <BillRow
                label={L.monthlyInstallment}
                value={formatLKR(snapshot.monthlyInstallment)}
              />
              <BillRow
                label={L.totalPayable}
                value={formatLKR(snapshot.totalPayable)}
              />
            </div>
            <p className="mam-bill-terms-note">
              {L.lateFeeRule}:{' '}
              {lateFeeRuleLabel(
                snapshot.lateFeeRatePercent,
                snapshot.monthlyInstallment
              )}{' '}
              · {L.gracePeriod}: {snapshot.gracePeriodDays} {L.days} ·{' '}
              {L.paymentDate}: {formatDate(snapshot.firstDueDate)}
            </p>
          </section>

          <section className="mam-bill-section">
            <h2 className="mam-bill-section-heading">{L.guarantorDetails}</h2>
            <div className="mam-bill-detail-block">
              <DetailRow label={L.customerName} value={snapshot.guarantor.name} />
              <DetailRow label={L.nic} value={snapshot.guarantor.nic} />
              <DetailRow label={L.phone} value={snapshot.guarantor.phone} />
              <DetailRow label={L.address} value={snapshot.guarantor.address} />
            </div>
          </section>

          {snapshot.collateral.length > 0 && (
            <section className="mam-bill-section">
              <h2 className="mam-bill-section-heading">{L.collateralHeld}</h2>
              {snapshot.collateral.map((c, i) => (
                <div key={i} className="mam-bill-detail-block mam-bill-collateral">
                  {c.fileNumber && (
                    <DetailRow label={L.fileNumber} value={c.fileNumber} />
                  )}
                  {c.vehicleNumber && (
                    <DetailRow label={L.vehicleNumber} value={c.vehicleNumber} />
                  )}
                  {c.guarantor1Name && (
                    <DetailRow label={L.guarantor1} value={c.guarantor1Name} />
                  )}
                  {c.guarantor2Name && (
                    <DetailRow label={L.guarantor2} value={c.guarantor2Name} />
                  )}
                  {c.description && (
                    <DetailRow label={L.description} value={c.description} />
                  )}
                </div>
              ))}
            </section>
          )}

          <p className="mam-bill-locked">{L.lockedNotice}</p>

          <div className="mam-bill-signatures">
            <div className="mam-bill-sig">
              <div className="mam-bill-sig-line" />
              <span>{L.customerSignature}</span>
            </div>
            <div className="mam-bill-sig">
              <div className="mam-bill-sig-line" />
              <span>{L.guarantorSignature}</span>
            </div>
            <div className="mam-bill-sig">
              <div className="mam-bill-sig-line" />
              <span>{L.authorizedOfficer}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
