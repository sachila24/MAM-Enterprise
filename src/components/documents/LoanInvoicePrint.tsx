import { formatLKR, formatDate } from '../../lib/format';
import { getDocumentLabels } from '../../lib/i18n/documentLabels';
import { lateFeeRuleLabel } from '../../lib/documents/snapshots';
import type {
  DocumentGuarantorSnapshot,
  LoanCreationDocumentSnapshot,
} from '../../lib/documents/types';
import type { DisplayMode } from '../../lib/i18n/simpleLabels';
import { MamDocumentFooter, MamDocumentHeader } from '../branding/MamLogo';

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

function GuarantorBlock({
  heading,
  guarantor,
  labels,
}: {
  heading: string;
  guarantor: DocumentGuarantorSnapshot;
  labels: {
    customerName: string;
    nic: string;
    phone: string;
    address: string;
  };
}) {
  const hasData =
    guarantor.name || guarantor.nic || guarantor.phone || guarantor.address;
  if (!hasData) return null;

  return (
    <div className="mam-bill-detail-block mam-bill-guarantor-block">
      <p className="mam-bill-guarantor-heading">{heading}</p>
      <DetailRow label={labels.customerName} value={guarantor.name ?? ''} />
      <DetailRow label={labels.nic} value={guarantor.nic ?? ''} />
      <DetailRow label={labels.address} value={guarantor.address ?? ''} />
      <DetailRow label={labels.phone} value={guarantor.phone ?? ''} />
    </div>
  );
}

function resolveGuarantors(snapshot: LoanCreationDocumentSnapshot): {
  guarantor1?: DocumentGuarantorSnapshot;
  guarantor2?: DocumentGuarantorSnapshot;
} {
  if (snapshot.guarantors?.guarantor1 || snapshot.guarantors?.guarantor2) {
    return snapshot.guarantors;
  }

  const legacy1 = snapshot.collateral.find((c) => c.guarantor1Name)?.guarantor1Name;
  const legacy2 = snapshot.collateral.find((c) => c.guarantor2Name)?.guarantor2Name;
  const legacySingle =
    snapshot.guarantor?.name && snapshot.guarantor.name !== '—'
      ? snapshot.guarantor
      : undefined;

  return {
    guarantor1: legacy1
      ? { name: legacy1 }
      : legacySingle
        ? {
            name: legacySingle.name !== '—' ? legacySingle.name : undefined,
            nic: legacySingle.nic !== '—' ? legacySingle.nic : undefined,
            phone: legacySingle.phone !== '—' ? legacySingle.phone : undefined,
            address:
              legacySingle.address !== '—' ? legacySingle.address : undefined,
          }
        : undefined,
    guarantor2: legacy2 ? { name: legacy2 } : undefined,
  };
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
  const guarantors = resolveGuarantors(snapshot);

  const initialPaid =
    snapshot.initialPayment ??
    (snapshot.downPayment ?? 0) +
      (snapshot.serviceFee ?? 0) +
      (snapshot.registrationFee ?? 0);
  const netAdvance =
    snapshot.netAdvancePayment ?? snapshot.downPayment ?? 0;

  const hasGuarantor1 = Boolean(guarantors.guarantor1);
  const hasGuarantor2 = Boolean(guarantors.guarantor2);
  const hasGuarantorSection = hasGuarantor1 || hasGuarantor2;

  return (
    <div id="document-print-area" className="receipt-document doc-invoice mam-bill">
      <div className="receipt-sheet mam-bill-sheet">
        <MamDocumentHeader title={L.loanInvoiceTitle}>
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
        </MamDocumentHeader>

        <div className="receipt-body mam-bill-body">
          {snapshot.bike ? (
            <section className="mam-bill-section">
              <div className="mam-bill-duo-grid mam-bill-loan-top-grid">
                <div className="mam-bill-duo-col">
                  <h2 className="mam-bill-section-heading">{L.customerDetails}</h2>
                  <div className="mam-bill-detail-block">
                    <DetailRow label={L.customerName} value={snapshot.customer.name} />
                    <DetailRow label={L.nic} value={snapshot.customer.nic} />
                    <DetailRow label={L.phone} value={snapshot.customer.phone} />
                    <DetailRow label={L.address} value={snapshot.customer.address} />
                  </div>
                </div>
                <div className="mam-bill-duo-col">
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
                </div>
              </div>
            </section>
          ) : (
            <section className="mam-bill-section">
              <h2 className="mam-bill-section-heading">{L.customerDetails}</h2>
              <div className="mam-bill-detail-block">
                <DetailRow label={L.customerName} value={snapshot.customer.name} />
                <DetailRow label={L.nic} value={snapshot.customer.nic} />
                <DetailRow label={L.phone} value={snapshot.customer.phone} />
                <DetailRow label={L.address} value={snapshot.customer.address} />
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
            <div className="mam-bill-finance-box mam-bill-dates-box">
              <BillRow
                label={L.loanReleaseDate}
                value={formatDate(snapshot.startDate)}
              />
              <BillRow
                label={L.firstPaymentDate}
                value={formatDate(snapshot.firstDueDate)}
              />
            </div>
            <p className="mam-bill-terms-note">
              {L.lateFeeRule}:{' '}
              {lateFeeRuleLabel(
                snapshot.lateFeeRatePercent,
                snapshot.monthlyInstallment
              )}{' '}
              · {L.gracePeriod}: {snapshot.gracePeriodDays} {L.days}
            </p>
          </section>

          {hasGuarantorSection && (
            <section className="mam-bill-section">
              <h2 className="mam-bill-section-heading">{L.guarantorDetails}</h2>
              <div
                className={`mam-bill-guarantor-grid ${
                  hasGuarantor1 && hasGuarantor2
                    ? 'mam-bill-guarantor-grid-two'
                    : 'mam-bill-guarantor-grid-one'
                }`}
              >
                <GuarantorBlock
                  heading={L.guarantor1}
                  guarantor={guarantors.guarantor1 ?? {}}
                  labels={{
                    customerName: L.customerName,
                    nic: L.nic,
                    phone: L.phone,
                    address: L.address,
                  }}
                />
                <GuarantorBlock
                  heading={L.guarantor2}
                  guarantor={guarantors.guarantor2 ?? {}}
                  labels={{
                    customerName: L.customerName,
                    nic: L.nic,
                    phone: L.phone,
                    address: L.address,
                  }}
                />
              </div>
            </section>
          )}

          <div className="mam-bill-notice-box">
            අළෙවි කරන ලද යතුරුපැදියක් වෙනත් යතුරුපැදියකට මාරු කරනු නොලැබේ.
          </div>
          <p className="mam-bill-notice-secondary">මෙම බිල්පත සුරක්ෂිතව තබා ගන්න.</p>

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

        <MamDocumentFooter />
      </div>
    </div>
  );
}
