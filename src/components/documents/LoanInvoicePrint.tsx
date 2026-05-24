import { formatLKR, formatDate } from '../../lib/format';
import { getDocumentLabels } from '../../lib/i18n/documentLabels';
import { lateFeeRuleLabel } from '../../lib/documents/snapshots';
import type { LoanCreationDocumentSnapshot } from '../../lib/documents/types';
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
  const planPreview = snapshot.installmentPlan.slice(0, 6);
  const planMore = snapshot.installmentPlan.length - planPreview.length;

  return (
    <div id="document-print-area" className="receipt-document doc-invoice">
      <div className="receipt-sheet">
        <header className="receipt-section receipt-header">
          <h1 className="receipt-company-name">{L.companyName}</h1>
          <p className="receipt-company-meta">No.47, Galmaduwa, Mahailuppallama</p>
          <p className="receipt-company-meta">Call: 071 593 1681 | 071 209 9416</p>
          <h2 className="doc-title">{L.loanInvoiceTitle}</h2>
          <div className="doc-meta-row">
            <p>
              <strong>{L.invoiceNumber}:</strong> {documentNumber}
            </p>
            <p>
              <strong>{L.createdDate}:</strong> {formatDate(createdAt)}
            </p>
            <p>
              <strong>{L.loanNumber}:</strong> {snapshot.loanCode}
            </p>
          </div>
          <p className="doc-locked-banner">{L.lockedNotice}</p>
        </header>

        <div className="receipt-body">
          <h3 className="doc-section-title">{L.customerDetails}</h3>
          <div className="doc-grid-2">
            <Field label={L.customerName} value={snapshot.customer.name} />
            <Field label={L.nic} value={snapshot.customer.nic} />
            <Field label={L.phone} value={snapshot.customer.phone} />
            <Field label={L.address} value={snapshot.customer.address} />
          </div>

          {snapshot.bike && (
            <>
              <h3 className="doc-section-title">{L.bikeDetails}</h3>
              <div className="doc-grid-2">
                <Field label={L.bikeModel} value={snapshot.bike.model} />
                <Field label={L.brand} value={snapshot.bike.brand} />
                <Field label={L.color} value={snapshot.bike.color} />
                <Field label={L.chassisNo} value={snapshot.bike.chassisNo} />
                <Field label={L.engineNo} value={snapshot.bike.engineNo} />
              </div>
            </>
          )}

          <h3 className="doc-section-title">{L.financeDetails}</h3>
          <div className="doc-grid-2">
            <Field label={L.cashPrice} value={formatLKR(snapshot.cashPrice)} />
            <Field label={L.downPayment} value={formatLKR(snapshot.downPayment)} />
            <Field
              label={L.financeAmount}
              value={formatLKR(snapshot.financeAmount)}
            />
            <Field
              label={L.interestAmount}
              value={formatLKR(snapshot.interestAmount)}
            />
            <Field
              label={L.totalPayable}
              value={formatLKR(snapshot.totalPayable)}
            />
            <Field
              label={L.monthlyInstallment}
              value={formatLKR(snapshot.monthlyInstallment)}
            />
            <Field
              label={L.installmentCount}
              value={String(snapshot.installmentCount)}
            />
            <Field
              label={L.lateFeeRule}
              value={lateFeeRuleLabel(
                snapshot.lateFeeRatePercent,
                snapshot.monthlyInstallment
              )}
            />
            <Field
              label={L.gracePeriod}
              value={`${snapshot.gracePeriodDays} ${L.days}`}
            />
          </div>

          {planPreview.length > 0 && (
            <>
              <h3 className="doc-section-title">{L.installmentPlan}</h3>
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{L.paymentDate}</th>
                    <th className="num">Amount (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {planPreview.map((row) => (
                    <tr key={row.number}>
                      <td>{row.number}</td>
                      <td>{formatDate(row.dueDate)}</td>
                      <td className="num">{formatLKR(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {planMore > 0 && (
                <p className="doc-locked-banner">
                  + {planMore} more installments (see loan ledger)
                </p>
              )}
            </>
          )}

          <h3 className="doc-section-title">{L.guarantorDetails}</h3>
          <div className="doc-grid-2">
            <Field label={L.customerName} value={snapshot.guarantor.name} />
            <Field label={L.nic} value={snapshot.guarantor.nic} />
            <Field label={L.phone} value={snapshot.guarantor.phone} />
            <Field label={L.address} value={snapshot.guarantor.address} />
          </div>

          {snapshot.collateral.length > 0 && (
            <>
              <h3 className="doc-section-title">{L.collateralHeld}</h3>
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Storage</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.collateral.map((c, i) => (
                    <tr key={i}>
                      <td>{c.description}</td>
                      <td>{c.itemType}</td>
                      <td>{c.storageLocation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="doc-signatures">
            <div className="doc-sig-line">{L.customerSignature}</div>
            <div className="doc-sig-line">{L.guarantorSignature}</div>
            <div className="doc-sig-line">{L.authorizedOfficer}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
