import type {
  FixedInstallmentReceiptBreakdown,
  InterestOnlyReceiptBreakdown,
} from '../../lib/finance/receipt';
import { isFixedInstallmentLoan, isInterestOnlyLoan } from '../../types/loan';
import type { Loan, RepaymentMethod } from '../../types/loan';
import { formatLKR } from '../../lib/format';
import {
  formatReceiptPaymentMethod,
  getReceiptLabels,
  type ReceiptLabelSet,
} from '../../lib/i18n/receiptLabels';
import type { DisplayMode } from '../../lib/i18n/simpleLabels';

export interface PaymentReceiptPrintProps {
  receiptNumber: string;
  paymentDate: string;
  customerName: string;
  paymentMethod: string;
  repaymentMethod: RepaymentMethod;
  receipt: InterestOnlyReceiptBreakdown | FixedInstallmentReceiptBreakdown;
  language?: DisplayMode;
  labels?: ReceiptLabelSet;
}

function formatReceiptDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { date: '—', time: '—' };
  }

  return {
    date: d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  };
}

function ReceiptRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="receipt-row">
      <span className="receipt-label">{label}</span>
      <span className={`receipt-value${bold ? ' receipt-bold' : ''}`}>{value}</span>
    </div>
  );
}

/** Bank-style A4 receipt; print via #receipt-print-area + receipt-print.css */
export function PaymentReceiptPrint({
  receiptNumber,
  paymentDate,
  customerName,
  paymentMethod,
  repaymentMethod,
  receipt,
  language = 'si',
  labels: labelsProp,
}: PaymentReceiptPrintProps) {
  const labels = labelsProp ?? getReceiptLabels(language);
  const { date, time } = formatReceiptDateTime(paymentDate);
  const loanStub = { repaymentMethod } as Pick<Loan, 'repaymentMethod'>;

  const balanceAfter =
    isFixedInstallmentLoan(loanStub) && 'loanBalance' in receipt
      ? receipt.loanBalance
      : isInterestOnlyLoan(loanStub) && 'remainingPrincipal' in receipt
        ? receipt.remainingPrincipal
        : 0;

  const discount = receipt.discountApplied ?? 0;
  const methodLabel = formatReceiptPaymentMethod(paymentMethod, language);

  const showInterest =
    isInterestOnlyLoan(loanStub) &&
    'interestPaid' in receipt &&
    receipt.interestPaid > 0;
  const showInstallment =
    isFixedInstallmentLoan(loanStub) &&
    'installmentPaid' in receipt &&
    receipt.installmentPaid > 0;
  const showPrincipal =
    isInterestOnlyLoan(loanStub) &&
    'principalPaid' in receipt &&
    receipt.principalPaid > 0;

  return (
    <div id="receipt-print-area" className="receipt-document">
      <div className="receipt-sheet">
        <header className="receipt-section receipt-header">
          <h1 className="receipt-company-name">M A M TRADING</h1>
          <p className="receipt-company-meta">කොළඹ</p>
          <p className="receipt-company-meta">ඇමතුම්: 011 234 5678</p>
          <h2 className="receipt-title">{labels.receiptTitle}</h2>

          <div className="receipt-meta-block">
            <p className="receipt-receipt-no">
              {labels.receiptNo}: {receiptNumber}
            </p>
            <div className="receipt-meta-row">
              <p>
                <span>{labels.date}:</span> {date}
              </p>
              <p>
                <span>{labels.time}:</span> {time}
              </p>
            </div>
          </div>
        </header>

        <div className="receipt-body">
          <section className="receipt-section">
            <ReceiptRow label={labels.customerName} value={customerName} />
            <ReceiptRow label={labels.paymentMethod} value={methodLabel} />
          </section>

          <hr className="receipt-rule" />

          <section className="receipt-section">
            <ReceiptRow
              label={labels.cashReceived}
              value={formatLKR(receipt.cashReceived)}
              bold
            />
            <ReceiptRow label={labels.discount} value={formatLKR(discount)} bold />
            <ReceiptRow
              label={labels.totalPaid}
              value={formatLKR(receipt.totalApplied)}
              bold
            />
            <ReceiptRow
              label={labels.balanceAfter}
              value={formatLKR(balanceAfter)}
              bold
            />
          </section>

          <hr className="receipt-rule" />

          <section className="receipt-section">
            <h3 className="receipt-section-title">{labels.loanSummary}</h3>
            {showInterest && 'interestPaid' in receipt && (
              <ReceiptRow
                label={labels.paidInterest}
                value={formatLKR(receipt.interestPaid)}
              />
            )}
            {showInstallment && 'installmentPaid' in receipt && (
              <ReceiptRow
                label={labels.paidInstallment}
                value={formatLKR(receipt.installmentPaid)}
              />
            )}
            {showPrincipal && 'principalPaid' in receipt && (
              <ReceiptRow
                label={labels.paidPrincipal}
                value={formatLKR(receipt.principalPaid)}
              />
            )}
            <ReceiptRow
              label={labels.remainingBalance}
              value={formatLKR(balanceAfter)}
              bold
            />
          </section>
        </div>

        <footer className="receipt-footer receipt-section">
          <p>{labels.thankYou}</p>
          <p>{labels.keepReceipt}</p>
        </footer>
      </div>
    </div>
  );
}
