import { formatDate, formatEnum, formatLKR } from '../../lib/format';
import { getDocumentLabels } from '../../lib/i18n/documentLabels';
import type { PaymentReceiptDocumentSnapshot } from '../../lib/documents/types';
import type { DisplayMode } from '../../lib/i18n/simpleLabels';
import { MamDocumentFooter, MamDocumentHeader } from '../branding/MamLogo';

function BillRow({
  label,
  value,
  tone = 'normal',
}: {
  label: string;
  value: string;
  tone?: 'normal' | 'due' | 'strong';
}) {
  return (
    <div className="mam-bill-row">
      <span className="mam-bill-row-label">{label}</span>
      <span className="mam-bill-row-leader" aria-hidden />
      <span
        className={`mam-bill-row-value ${
          tone === 'strong'
            ? 'mam-bill-strong-value'
            : tone === 'due'
              ? 'mam-bill-due-value'
              : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function formatTimeOnly(value: string): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
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
  const isInterestOnly =
    snapshot.repaymentMethod === 'INTEREST_ONLY_REDUCING_PRINCIPAL';
  const customerName = snapshot.customer?.name ?? snapshot.customerName ?? '—';
  const customerNic = snapshot.customer?.nic ?? '—';
  const customerPhone = snapshot.customer?.phone ?? '—';
  const hasPaymentTimePart = /:\d{2}/.test(snapshot.paymentDate);
  const paymentTimeSource = hasPaymentTimePart
    ? snapshot.paymentDate
    : createdAt;
  const previousBalance = b.remainingBalance + b.totalApplied;
  const totalReceived = b.cashReceived;

  return (
    <div
      id="document-print-area"
      className="receipt-document mam-bill mam-bill-payment-receipt receipt-print-b5"
    >
      <div className="receipt-sheet mam-bill-sheet">
        <MamDocumentHeader title={L.paymentReceiptTitle} logoSize={58}>
          <p className="mam-bill-receipt-prominent">
            {L.receiptNumber}: <strong>{snapshot.receiptNumber}</strong>
          </p>
          <div className="mam-bill-meta">
            <span>
              {L.createdDate}: <strong>{formatDate(createdAt)}</strong>
            </span>
            <span>
              {L.loanNumber}: <strong>{snapshot.loanCode}</strong>
            </span>
          </div>
        </MamDocumentHeader>

        <div className="receipt-body mam-bill-body">
          <section className="mam-bill-section">
            <div className="mam-bill-duo-grid">
              <div className="mam-bill-duo-col">
                <h2 className="mam-bill-section-heading">{L.customerInformation}</h2>
                <div className="mam-bill-finance-box">
                  <BillRow label={L.customerName} value={customerName} />
                  <BillRow label={L.nic} value={customerNic} />
                  <BillRow label={L.phone} value={customerPhone} />
                </div>
              </div>
              <div className="mam-bill-duo-col">
                <h2 className="mam-bill-section-heading">{L.loanInformation}</h2>
                <div className="mam-bill-finance-box">
                  <BillRow label={L.loanNumber} value={snapshot.loanCode} />
                  <BillRow label={L.bikeModel} value={snapshot.bikeModel ?? '—'} />
                  <BillRow
                    label={L.registrationNumber}
                    value={snapshot.registrationNumber ?? '—'}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="mam-bill-section">
            <h2 className="mam-bill-section-heading">{L.paymentInformation}</h2>
            <div className="mam-bill-finance-box">
              <BillRow label={L.receiptNumber} value={snapshot.receiptNumber} />
              <BillRow
                label={L.paymentDate}
                value={formatDate(snapshot.paymentDate)}
              />
              <BillRow
                label={L.paymentTime}
                value={formatTimeOnly(paymentTimeSource)}
              />
              <BillRow
                label={L.paymentMethod}
                value={formatEnum(snapshot.paymentMethod, language)}
              />
              <BillRow
                label={L.paymentAmount}
                value={formatLKR(snapshot.paidAmount)}
              />
              <BillRow label={L.lateFee} value={formatLKR(b.lateFeePaid)} />
              <BillRow label={L.totalReceived} value={formatLKR(totalReceived)} />
              {isInterestOnly && (
                <BillRow
                  label={L.previousBalance}
                  value={formatLKR(previousBalance)}
                />
              )}
              {isInterestOnly && (
                <BillRow
                  label={L.remainingBalance}
                  value={formatLKR(b.remainingBalance)}
                  tone="strong"
                />
              )}
              <BillRow
                label={L.nextDueDate}
                value={
                  snapshot.nextDueDate ? formatDate(snapshot.nextDueDate) : '—'
                }
                tone="due"
              />
              <BillRow
                label={L.installmentNumber}
                value={snapshot.installmentNumberLabel ?? '—'}
                tone="due"
              />
            </div>
            <p className="mam-bill-terms-note">
              {L.cashier}: {snapshot.cashierName}
            </p>
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

        <MamDocumentFooter showEmail={false} />
      </div>
    </div>
  );
}
