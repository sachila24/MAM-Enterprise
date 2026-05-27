import { formatLKR, formatDate } from '../../lib/format';
import { getDocumentLabels } from '../../lib/i18n/documentLabels';
import type { LoanReleaseDocumentSnapshot } from '../../lib/documents/types';
import type { DisplayMode } from '../../lib/i18n/simpleLabels';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="doc-field">
      <span className="doc-field-label">{label}</span>
      <span className="doc-field-value">{value}</span>
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
    <article className="doc-sheet">
      <header className="doc-header">
        <h1 className="doc-title">{L.loanReleaseTitle}</h1>
        <p className="doc-company">{L.companyName}</p>
      </header>

      <section className="doc-meta-grid">
        <Field label={L.releaseNoteNumber} value={documentNumber} />
        <Field label={L.createdDate} value={formatDate(createdAt)} />
        <Field label={L.loanNumber} value={snapshot.loanCode} />
        <Field label={L.paymentDate} value={formatDate(snapshot.releaseDate)} />
      </section>

      <section className="doc-section">
        <h2 className="doc-section-title">{L.customerDetails}</h2>
        <div className="doc-grid-2">
          <Field label={L.customerName} value={snapshot.customer.name} />
          <Field label={L.nic} value={snapshot.customer.nic} />
          <Field label={L.phone} value={snapshot.customer.phone} />
          <Field label={L.address} value={snapshot.customer.address} />
        </div>
      </section>

      <section className="doc-section">
        <h2 className="doc-section-title">{L.releaseDetails}</h2>
        <div className="doc-grid-2">
          <Field
            label={L.principalReleased}
            value={formatLKR(snapshot.principalAmount)}
          />
          <Field label={L.releasedBy} value={snapshot.releasedBy} />
        </div>
        {snapshot.remarks.trim() && (
          <Field label={L.remarks} value={snapshot.remarks} />
        )}
      </section>

      <footer className="doc-signatures doc-grid-2">
        <div>
          <p className="doc-signature-line" />
          <p className="doc-signature-caption">{L.customerSignature}</p>
        </div>
        <div>
          <p className="doc-signature-line" />
          <p className="doc-signature-caption">{L.authorizedOfficer}</p>
        </div>
      </footer>
    </article>
  );
}
