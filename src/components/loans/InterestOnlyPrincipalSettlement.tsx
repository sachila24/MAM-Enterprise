import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatLKR } from '../../lib/format';
import { roundLKR } from '../../lib/finance/money';
import { getLabel } from '../../lib/i18n/simpleLabels';
import {
  recordInterestOnlyPrincipalSettlement,
  type InterestOnlyPrincipalSettlementKind,
} from '../../lib/local-db/repositories';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import { useToast } from '../ui/Toast';
import { useT } from '../../i18n/I18nProvider';
import type { Loan } from '../../types/loan';

export function InterestOnlyPrincipalSettlement({
  loan,
  customerId,
  paymentDate,
}: {
  loan: Loan;
  customerId: string;
  paymentDate: string;
}) {
  const { t } = useT();
  const db = useDemoDb();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const submitRef = useRef(false);

  const principal = loan.currentPrincipalBalance;
  const halfAmount = roundLKR(principal / 2);
  const fullAmount = roundLKR(principal);

  if (principal <= 0 || loan.status === 'COMPLETED' || loan.status === 'SETTLED') {
    return null;
  }

  const runSettlement = async (kind: InterestOnlyPrincipalSettlementKind) => {
    if (submitRef.current) return;
    submitRef.current = true;
    setSubmitting(true);
    try {
      const result = recordInterestOnlyPrincipalSettlement(
        {
          loanId: loan.id,
          customerId,
          kind,
          paymentDate,
          clientSubmitId: crypto.randomUUID(),
        },
        db
      );
      const label =
        kind === 'HALF' ? t('halfSettlement') : t('fullSettlement');
      showToast(`${label}: ${result.receiptNumber}`, 'success');
      navigate(`/loans/${loan.id}`, { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('paymentSaveFailed'), 'error');
      submitRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
      <h2 className="text-base font-semibold text-neutral-900 mb-1">
        {t('principalSettlement')}
      </h2>
      <p className="text-sm text-neutral-600 mb-4">
        {getLabel('ledgerAllocPrincipalPayment', 'both')}:{' '}
        <span className="font-semibold tabular-nums">{formatLKR(principal)}</span>
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={submitting || halfAmount <= 0}
          onClick={() => runSettlement('HALF')}
          className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
        >
          {t('halfSettlement')}
          <span className="block text-xs font-normal text-neutral-500 tabular-nums mt-0.5">
            {formatLKR(halfAmount)}
          </span>
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => runSettlement('FULL')}
          className="rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {t('fullSettlement')}
          <span className="block text-xs font-normal text-brand-100 tabular-nums mt-0.5">
            {formatLKR(fullAmount)}
          </span>
        </button>
      </div>
    </section>
  );
}
