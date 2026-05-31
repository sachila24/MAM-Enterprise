import { formatLKR, formatDate } from '../../lib/format';
import { getDocumentLabels } from '../../lib/i18n/documentLabels';
import type { LoanReleaseDocumentSnapshot } from '../../lib/documents/types';
import type { DisplayMode } from '../../lib/i18n/simpleLabels';
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

export interface LoanReleaseNotePrintProps {
  documentNumber: string;
  createdAt: string;
  snapshot: LoanReleaseDocumentSnapshot;
  language?: DisplayMode;
}

export function LoanReleaseNotePrint({
  documentNumber,
  createdAt,
  snapshot,
  language = 'both',
}: LoanReleaseNotePrintProps) {
  const L = getDocumentLabels(language);

  return (
    <div id="document-print-area" className="receipt-document mam-bill">
      <div className="receipt-sheet mam-bill-sheet">
        <MamDocumentHeader title={L.loanReleaseTitle}>
          <div className="mam-bill-meta">
            <span>
              {L.releaseNoteNumber}: <strong>{documentNumber}</strong>
            </span>
            <span>
              {L.createdDate}: <strong>{formatDate(createdAt)}</strong>
            </span>
            <span>
              {L.loanNumber}: <strong>{snapshot.loanCode}</strong>
            </span>
            <span>
              {L.loanReleaseDate}: <strong>{formatDate(snapshot.releaseDate)}</strong>
            </span>
          </div>
        </MamDocumentHeader>

        <div className="receipt-body mam-bill-body">
          <section className="mam-bill-section">
            <h2 className="mam-bill-section-heading">{L.customerDetails}</h2>
            <div className="mam-bill-detail-block">
              <DetailRow label={L.customerName} value={snapshot.customer.name} />
              <DetailRow label={L.nic} value={snapshot.customer.nic} />
              <DetailRow label={L.phone} value={snapshot.customer.phone} />
              <DetailRow label={L.address} value={snapshot.customer.address} />
            </div>
          </section>

          <section className="mam-bill-section mam-bill-finance">
            <h2 className="mam-bill-section-heading">{L.releaseDetails}</h2>
            <div className="mam-bill-finance-box">
              <BillRow
                label={L.principalReleased}
                value={formatLKR(snapshot.principalAmount)}
              />
              <BillRow label={L.releasedBy} value={snapshot.releasedBy} />
            </div>
            {snapshot.remarks.trim() && (
              <div className="mam-bill-detail-block">
                <DetailRow label={L.remarks} value={snapshot.remarks} />
              </div>
            )}
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
      </div>
    </div>
  );
}
