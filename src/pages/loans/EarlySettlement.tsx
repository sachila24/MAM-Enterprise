import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import {
  calculateEarlySettlementQuote,
  canRequestEarlySettlement,
  estimateFixedLoanSettlementParts,
} from '../../lib/finance/earlySettlement';
import { resolveCurrentInstallmentNumber } from '../../lib/finance/fixedInstallmentStatus';
import { summarizeFixedInstallmentDue } from '../../lib/finance/paymentAllocation';
import { roundLKR } from '../../lib/finance/money';
import { formatLKR } from '../../lib/format';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import { getLoanDetailFromDb, recordEarlySettlement } from '../../lib/local-db/repositories';
import { useToast } from '../../components/ui/Toast';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { parsePercentInput, sanitizePercentInput } from '../../lib/finance/parsePercent';

export function EarlySettlement() {
  const { id } = useParams<{ id: string }>();
  const db = useDemoDb();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [discountPctInput, setDiscountPctInput] = useState('0');
  const [includeCurrentMonth, setIncludeCurrentMonth] = useState(true);
  const [cashReceived, setCashReceived] = useState(0);
  const [discountWaiver, setDiscountWaiver] = useState(0);
  const [saving, setSaving] = useState(false);

  const detail = id ? getLoanDetailFromDb(id, db) : null;
  const loan = detail?.loan;
  const customer = detail?.customer;

  const paymentDate = new Date().toISOString().split('T')[0];

  const instInputs = useMemo(
    () =>
      (detail?.installments ?? []).map((i) => ({
        id: i.id,
        installmentNumber: i.installmentNumber,
        dueDate: i.dueDate,
        installmentAmount: i.installmentAmount,
        paidAmount: i.paidAmount,
        lateFeeAmount: i.lateFeeAmount,
        lateFeePaid: i.lateFeePaid,
      })),
    [detail?.installments]
  );

  const currentInstallmentNumber = useMemo(() => {
    if (!loan || instInputs.length === 0) return 1;
    return resolveCurrentInstallmentNumber(instInputs, paymentDate);
  }, [loan, instInputs, paymentDate]);

  const dueSummary = useMemo(() => {
    if (!loan || instInputs.length === 0) return null;
    return summarizeFixedInstallmentDue(
      {
        installments: instInputs,
        paymentDate,
        lateFeeRatePercent: loan.lateFeeRate,
        currentInstallmentNumber,
      },
      paymentDate
    );
  }, [loan, instInputs, paymentDate, currentInstallmentNumber]);

  const settlementParts = useMemo(() => {
    if (!detail?.installments.length) {
      return { remainingPrincipal: 0, remainingInterest: 0 };
    }
    return estimateFixedLoanSettlementParts(
      detail.installments.map((i) => ({
        installmentAmount: i.installmentAmount,
        paidAmount: i.paidAmount,
        principalComponent: i.principalComponent,
        interestComponent: i.interestComponent,
      }))
    );
  }, [detail?.installments]);

  const discountPct = parsePercentInput(discountPctInput);

  const quote = useMemo(() => {
    if (!loan || !detail) {
      return null;
    }
    return calculateEarlySettlementQuote({
      monthsCompleted: detail.monthsCompleted,
      minimumMonthsBeforeSettlement: loan.minimumMonthsBeforeSettlement,
      remainingPrincipal: settlementParts.remainingPrincipal,
      remainingInterest: settlementParts.remainingInterest,
      discountPercentage: discountPct,
      currentMonthDue: dueSummary?.currentMonthDue ?? 0,
      includeCurrentMonthDue: includeCurrentMonth,
    });
  }, [
    loan,
    detail,
    settlementParts,
    discountPct,
    dueSummary?.currentMonthDue,
    includeCurrentMonth,
  ]);

  const balanceBefore = loan ? roundLKR(loan.balanceAmount) : 0;

  useEffect(() => {
    if (!quote) return;
    const c = quote.finalSettlementAmount;
    const w = roundLKR(balanceBefore - c);
    setCashReceived(c);
    setDiscountWaiver(w >= 0 ? w : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync form defaults when settlement quote drivers change
  }, [quote?.finalSettlementAmount, balanceBefore, discountPct, includeCurrentMonth]);

  if (!id || !detail || !loan || !customer) {
    return (
      <div className="max-w-2xl mx-auto pt-12 px-4">
        <p className="text-neutral-600">Loan not found.</p>
        <Link to="/loans" className="mt-4 inline-block text-brand-600 font-semibold">
          Back to loans
        </Link>
      </div>
    );
  }

  if (loan.repaymentMethod !== 'FIXED_TERM_INSTALLMENT') {
    return (
      <div className="max-w-2xl mx-auto pt-12 px-4">
        <p className="text-neutral-600">
          Early settlement is only available for fixed installment loans.
        </p>
        <Link to={`/loans/${loan.id}`} className="mt-4 inline-block text-brand-600 font-semibold">
          Back to loan
        </Link>
      </div>
    );
  }

  const eligible = canRequestEarlySettlement(
    detail.monthsCompleted,
    loan.minimumMonthsBeforeSettlement
  );

  const handleRecord = () => {
    if (!eligible || saving) return;
    const apply = roundLKR(cashReceived + discountWaiver);
    if (Math.abs(apply - balanceBefore) > 1) {
      showToast(
        'Cash plus owner waiver must equal the full loan balance to close.',
        'error'
      );
      return;
    }
    setSaving(true);
    try {
      const { receiptNumber } = recordEarlySettlement(
        {
          loanId: loan.id,
          customerId: customer.id,
          settlementDate: paymentDate,
          cashReceived,
          discountAmount: discountWaiver,
          notes: `Early settlement · interest discount ${discountPct}%`,
        },
        db
      );
      showToast(`Settlement saved · ${receiptNumber}`, 'success');
      navigate(`/loans/${loan.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not save settlement';
      showToast(msg, 'error');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <button
        type="button"
        onClick={() => navigate(`/loans/${loan.id}`)}
        className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to loan
      </button>

      <h1 className="text-2xl font-semibold text-neutral-900">Early settlement</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Close the loan in the ledger. Cash collection counts only money received; owner
        waiver fills the rest of the contractual balance.
      </p>

      {!eligible ? (
        <div className="mt-8 rounded-lg bg-warning-50 px-4 py-3 text-sm text-warning-900 ring-1 ring-warning-200">
          Early settlement is allowed after {loan.minimumMonthsBeforeSettlement} completed
          installments. Currently {detail.monthsCompleted} completed.
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <section className="rounded-xl bg-white p-6 ring-1 ring-neutral-200 shadow-sm">
            <h2 className="text-sm font-semibold text-neutral-900">Loan</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-neutral-500">Loan code</dt>
                <dd className="font-mono font-semibold text-brand-700">{loan.loanCode}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Customer</dt>
                <dd className="font-medium">{customer.name}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Finance amount</dt>
                <dd className="tabular-nums">{formatLKR(loan.principalAmount)}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Term</dt>
                <dd>{loan.termMonths} months</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Monthly installment</dt>
                <dd className="tabular-nums font-medium">
                  {formatLKR(loan.installmentAmount ?? 0)}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Completed installments</dt>
                <dd>{detail.monthsCompleted}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-neutral-500">Contract balance to close</dt>
                <dd className="text-lg font-bold tabular-nums text-neutral-900">
                  {formatLKR(balanceBefore)}
                </dd>
              </div>
            </dl>
          </section>

          {quote && (
            <section className="rounded-xl bg-white p-6 ring-1 ring-neutral-200 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-neutral-900">Settlement calculation</h2>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-neutral-500">Remaining principal (estimate)</dt>
                  <dd className="tabular-nums">{formatLKR(quote.remainingPrincipal)}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Remaining interest (estimate)</dt>
                  <dd className="tabular-nums">{formatLKR(quote.remainingInterest)}</dd>
                </div>
              </dl>

              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-1">
                  Discount on remaining interest (%)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={discountPctInput}
                  onChange={(e) => setDiscountPctInput(sanitizePercentInput(e.target.value))}
                  className="block w-full max-w-xs rounded-md border-0 py-1.5 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm tabular-nums"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-neutral-800">
                <input
                  type="checkbox"
                  checked={includeCurrentMonth}
                  onChange={(e) => setIncludeCurrentMonth(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-brand-600"
                />
                Include current month installment / dues ({formatLKR(quote.currentMonthDue)})
              </label>

              <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm ring-1 ring-brand-100">
                <p className="text-neutral-700">
                  Suggested cash to collect (after interest discount):{' '}
                  <strong className="tabular-nums">{formatLKR(quote.finalSettlementAmount)}</strong>
                </p>
                <p className="mt-1 text-xs text-neutral-600">
                  Owner waiver to reach full balance:{' '}
                  <span className="tabular-nums font-medium">
                    {formatLKR(roundLKR(balanceBefore - quote.finalSettlementAmount))}
                  </span>
                </p>
              </div>
            </section>
          )}

          <section className="rounded-xl bg-white p-6 ring-1 ring-neutral-200 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-neutral-900">Record settlement</h2>
            <CurrencyInput
              label="Cash to collect *"
              value={cashReceived}
              onChange={setCashReceived}
            />
            <CurrencyInput
              label="Owner waiver (discount toward balance) *"
              value={discountWaiver}
              onChange={setDiscountWaiver}
            />
            <p className="text-xs text-neutral-600">
              Total applied:{' '}
              <span className="font-semibold tabular-nums">
                {formatLKR(roundLKR(cashReceived + discountWaiver))}
              </span>
              {' · '}
              Must match contract balance {formatLKR(balanceBefore)}.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(`/loans/${loan.id}`)}
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-neutral-900 ring-1 ring-neutral-300 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !eligible}
                onClick={handleRecord}
                className="rounded-md bg-success-600 px-4 py-2 text-sm font-semibold text-white hover:bg-success-500 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Confirm settlement'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
