import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusChip } from '../../components/ui/StatusChip';
import { useToast } from '../../components/ui/Toast';
import { formatDate, formatEnum, formatLKR } from '../../lib/format';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import {
  getGuarantee,
  getLoan,
  listCustomers,
  releaseGuarantee,
} from '../../lib/local-db/repositories';
import { EmptyState } from '../../components/ui/EmptyState';

export function GuaranteeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const db = useDemoDb();
  const { showToast } = useToast();
  const [releasedTo, setReleasedTo] = useState('');

  const guarantee = id ? getGuarantee(id, db) : undefined;
  const loan = guarantee ? getLoan(guarantee.loanId, db) : undefined;
  const customer = loan
    ? listCustomers(db).find((c) => c.id === loan.customerId)
    : undefined;

  if (!id || !guarantee) {
    return (
      <div className="max-w-3xl mx-auto pt-8">
        <EmptyState
          icon={AlertCircleIcon}
          title="Guarantee not found"
          description="It may have been removed or the link is invalid."
        />
        <div className="text-center mt-4">
          <Link
            to="/guarantees"
            className="text-sm font-semibold text-brand-600 hover:text-brand-500"
          >
            Back to guarantees
          </Link>
        </div>
      </div>
    );
  }

  const handleRelease = () => {
    const to = releasedTo.trim();
    if (!to) {
      showToast('Enter who received the item.', 'error');
      return;
    }
    const updated = releaseGuarantee(guarantee.id, to, db);
    if (!updated) {
      showToast('Could not update guarantee.', 'error');
      return;
    }
    showToast(`${updated.guaranteeCode} marked as returned`, 'success');
    navigate('/guarantees');
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/guarantees')}
          className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Guarantees
        </button>
      </div>

      <PageHeader
        title={guarantee.description}
        subtitle={
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
            <span className="tabular-nums font-medium text-neutral-900">
              {guarantee.guaranteeCode}
            </span>
            <StatusChip status={guarantee.status} />
            <span>{formatEnum(guarantee.type)}</span>
          </div>
        }
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
            <h3 className="text-base font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-brand-600" />
              Item details
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
              <div>
                <dt className="text-neutral-500">Reference</dt>
                <dd className="mt-0.5 font-medium text-neutral-900">
                  {guarantee.itemReference || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Owner on document</dt>
                <dd className="mt-0.5 font-medium text-neutral-900">
                  {guarantee.ownerNameOnDocument || '—'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-neutral-500">Storage</dt>
                <dd className="mt-0.5 font-medium text-neutral-900">
                  {guarantee.storageLocation}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Received</dt>
                <dd className="mt-0.5 tabular-nums text-neutral-900">
                  {formatDate(guarantee.receivedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Notes</dt>
                <dd className="mt-0.5 text-neutral-900">
                  {guarantee.notes || '—'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
            <h3 className="text-base font-semibold text-neutral-900 mb-4">
              Linked customer & loan
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-neutral-500">Customer</dt>
                <dd className="mt-0.5 font-medium text-neutral-900">
                  {customer?.name ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Loan</dt>
                <dd className="mt-0.5">
                  {loan ? (
                    <Link
                      to={`/loans/${loan.id}`}
                      className="font-semibold text-brand-600 hover:text-brand-500 tabular-nums"
                    >
                      {loan.loanCode}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              {loan && (
                <>
                  <div>
                    <dt className="text-neutral-500">Finance / principal</dt>
                    <dd className="mt-0.5 tabular-nums font-medium text-neutral-900">
                      {formatLKR(loan.principalAmount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Loan balance</dt>
                    <dd className="mt-0.5 tabular-nums font-medium text-neutral-900">
                      {formatLKR(loan.balanceAmount)}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </div>

        <div className="space-y-6">
          {guarantee.status === 'held' ? (
            <div className="rounded-xl bg-neutral-50 ring-1 ring-neutral-200 p-6">
              <h3 className="text-sm font-semibold text-neutral-900 mb-2">
                Mark as returned
              </h3>
              <p className="text-xs text-neutral-600 mb-4">
                Record who physically received the guarantee back. Returned date is
                set automatically.
              </p>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Returned to *
              </label>
              <input
                type="text"
                value={releasedTo}
                onChange={(e) => setReleasedTo(e.target.value)}
                placeholder="Customer name / representative"
                className="block w-full rounded-md border-0 py-2 px-3 text-sm ring-1 ring-inset ring-neutral-300 mb-4"
              />
              <button
                type="button"
                onClick={handleRelease}
                className="w-full rounded-md bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-500"
              >
                Confirm return
              </button>
            </div>
          ) : (
            <div className="rounded-xl bg-success-50 ring-1 ring-success-200 p-6 text-sm">
              <h3 className="font-semibold text-success-900 mb-2">Returned</h3>
              {guarantee.releasedAt && (
                <p className="text-success-800">
                  Date:{' '}
                  <span className="tabular-nums font-medium">
                    {formatDate(guarantee.releasedAt)}
                  </span>
                </p>
              )}
              {guarantee.releasedTo && (
                <p className="text-success-800 mt-2">
                  Returned to:{' '}
                  <span className="font-medium">{guarantee.releasedTo}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
