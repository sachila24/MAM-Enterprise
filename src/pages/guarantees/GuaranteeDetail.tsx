import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  ShieldCheckIcon,
  UserIcon,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusChip } from '../../components/ui/StatusChip';
import { useToast } from '../../components/ui/Toast';
import { formatDate, formatLKR } from '../../lib/format';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import { LinkedBikeSummary } from '../../components/guarantees/LinkedBikeSummary';
import {
  getBike,
  getGuarantee,
  getLoan,
  listCustomers,
  releaseGuarantee,
} from '../../lib/local-db/repositories';
import { EmptyState } from '../../components/ui/EmptyState';
import { useT } from '../../i18n/I18nProvider';
import type { Guarantee } from '../../types/entities';

function displayValue(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed || '—';
}

function guaranteeTitle(g: Guarantee): string {
  const file = g.fileNumber?.trim();
  const vehicle = (g.vehicleNumber ?? g.itemReference)?.trim();
  if (file && vehicle) return `${file} · ${vehicle}`;
  if (file) return file;
  if (vehicle) return vehicle;
  if (g.description.trim()) return g.description;
  return g.guaranteeCode;
}

function GuaranteeStatusBadge({ status }: { status: Guarantee['status'] }) {
  const { t } = useT();
  const held = status === 'held';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        held
          ? 'bg-warning-50 text-warning-800 ring-warning-200'
          : 'bg-success-50 text-success-800 ring-success-200'
      }`}
    >
      {t(held ? 'guaranteeStatusHeld' : 'guaranteeStatusReleased')}
    </span>
  );
}

function InfoMiniCard({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-lg bg-neutral-50 px-4 py-3 ring-1 ring-inset ring-neutral-200">
      <dt className="text-xs font-medium text-neutral-500">{label}</dt>
      <dd
        className={`mt-1 text-sm tabular-nums ${
          emphasize ? 'font-semibold text-neutral-900' : 'font-medium text-neutral-800'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function DetailSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
      <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900 mb-5">
        <Icon className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
        {title}
      </h2>
      {children}
    </section>
  );
}

function FieldGrid({
  fields,
}: {
  fields: Array<{ label: string; value: React.ReactNode }>;
}) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label}>
          <dt className="text-sm font-medium text-neutral-500">{field.label}</dt>
          <dd className="mt-1 text-sm text-neutral-900">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function GuaranteeDetail() {
  const { t } = useT();
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
  const linkedBike = loan?.bikeId ? getBike(loan.bikeId, db) : undefined;

  if (!id || !guarantee) {
    return (
      <div className="max-w-3xl mx-auto pt-8">
        <EmptyState
          icon={AlertCircleIcon}
          title={t('guaranteeNotFound')}
          description={t('guaranteeNotFound')}
        />
        <div className="text-center mt-4">
          <Link
            to="/guarantees"
            className="text-sm font-semibold text-brand-600 hover:text-brand-500"
          >
            {t('backToGuarantees')}
          </Link>
        </div>
      </div>
    );
  }

  const handleRelease = () => {
    const to = releasedTo.trim();
    if (!to) {
      showToast(t('enterReturnedTo'), 'error');
      return;
    }
    const updated = releaseGuarantee(guarantee.id, to, db);
    if (!updated) {
      showToast(t('guaranteeSaveFailed'), 'error');
      return;
    }
    showToast(`${updated.guaranteeCode} ${t('markReturned')}`, 'success');
    navigate('/guarantees');
  };

  const isHeld = guarantee.status === 'held';
  const fileNumber = displayValue(guarantee.fileNumber);
  const vehicleNumber = displayValue(
    guarantee.vehicleNumber ?? guarantee.itemReference
  );

  const guarantor1Fields = [
    { label: t('guarantorName'), value: displayValue(guarantee.guarantor1Name ?? guarantee.ownerNameOnDocument) },
    { label: t('guarantorAddress'), value: displayValue(guarantee.guarantor1Address) },
    { label: t('guarantorPhone'), value: displayValue(guarantee.guarantor1Phone) },
    { label: t('guarantorNic'), value: displayValue(guarantee.guarantor1Nic) },
  ];

  const guarantor2Fields = [
    { label: t('guarantorName'), value: displayValue(guarantee.guarantor2Name) },
    { label: t('guarantorAddress'), value: displayValue(guarantee.guarantor2Address) },
    { label: t('guarantorPhone'), value: displayValue(guarantee.guarantor2Phone) },
    { label: t('guarantorNic'), value: displayValue(guarantee.guarantor2Nic) },
  ];

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/guarantees')}
          className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t('guarantees')}
        </button>
      </div>

      <PageHeader
        title={guaranteeTitle(guarantee)}
        subtitle={
          <div className="mt-2">
            <GuaranteeStatusBadge status={guarantee.status} />
          </div>
        }
      />

      <div className="mt-8 space-y-6">
        <DetailSection title={t('guaranteeInformation')} icon={ShieldCheckIcon}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <InfoMiniCard label={t('fileNumber')} value={fileNumber} emphasize />
            <InfoMiniCard label={t('vehicleNumber')} value={vehicleNumber} emphasize />
            <InfoMiniCard
              label={t('field.status')}
              value={t(
                isHeld ? 'guaranteeStatusHeld' : 'guaranteeStatusReleased'
              )}
            />
            <InfoMiniCard
              label={t('receivedDate')}
              value={formatDate(guarantee.receivedAt)}
            />
            {!isHeld && guarantee.releasedAt && (
              <InfoMiniCard
                label={t('guaranteeReleasedDate')}
                value={formatDate(guarantee.releasedAt)}
              />
            )}
          </div>
          {linkedBike && (
            <div className="mt-4 pt-4 border-t border-neutral-200">
              <LinkedBikeSummary bike={linkedBike} />
            </div>
          )}
        </DetailSection>

        <DetailSection title={t('guarantor1')} icon={UserIcon}>
          <FieldGrid fields={guarantor1Fields} />
        </DetailSection>

        <DetailSection title={t('guarantor2')} icon={UserIcon}>
          <FieldGrid fields={guarantor2Fields} />
        </DetailSection>

        <DetailSection title={t('linkedLoanInformation')} icon={BanknoteIcon}>
          <FieldGrid
            fields={[
              {
                label: t('field.customer'),
                value: customer?.name ?? '—',
              },
              {
                label: t('colLoanNumber'),
                value: loan ? (
                  <Link
                    to={`/loans/${loan.id}`}
                    className="font-semibold text-brand-600 hover:text-brand-500 tabular-nums"
                  >
                    {loan.loanCode}
                  </Link>
                ) : (
                  '—'
                ),
              },
              {
                label: t('financeAmount'),
                value: loan ? formatLKR(loan.principalAmount) : '—',
              },
              {
                label: t('totalLoanAmount'),
                value: loan
                  ? formatLKR(loan.totalPayable ?? loan.balanceAmount)
                  : '—',
              },
              {
                label: t('currentDueBalance'),
                value: loan ? formatLKR(loan.balanceAmount) : '—',
              },
              {
                label: t('field.status'),
                value: loan ? (
                  <StatusChip status={loan.status} showDot={false} />
                ) : (
                  '—'
                ),
              },
            ]}
          />
        </DetailSection>

        <DetailSection title={t('returnReleaseInformation')} icon={CheckCircle2Icon}>
          {isHeld ? (
            <div className="rounded-lg bg-neutral-50 p-5 ring-1 ring-inset ring-neutral-200">
              <p className="text-sm font-medium text-neutral-900 mb-4">
                {t('currentlyHeldByCompany')}
              </p>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {t('returnedTo')} *
              </label>
              <input
                type="text"
                value={releasedTo}
                onChange={(e) => setReleasedTo(e.target.value)}
                placeholder={t('returnedTo')}
                className="block w-full max-w-md rounded-md border-0 py-2 px-3 text-sm ring-1 ring-inset ring-neutral-300 mb-4"
              />
              <button
                type="button"
                onClick={handleRelease}
                className="inline-flex rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500"
              >
                {t('confirmReturn')}
              </button>
            </div>
          ) : (
            <div className="rounded-lg bg-success-50 p-5 ring-1 ring-inset ring-success-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2Icon className="h-5 w-5 text-success-600" aria-hidden />
                <span className="text-sm font-semibold text-success-900">
                  {t('guaranteeStatusReleased')}
                </span>
              </div>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                {guarantee.releasedAt && (
                  <div>
                    <dt className="font-medium text-success-800">
                      {t('guaranteeReleasedDate')}
                    </dt>
                    <dd className="mt-0.5 tabular-nums text-success-900">
                      {formatDate(guarantee.releasedAt)}
                    </dd>
                  </div>
                )}
                {guarantee.releasedTo && (
                  <div>
                    <dt className="font-medium text-success-800">
                      {t('returnedTo')}
                    </dt>
                    <dd className="mt-0.5 font-medium text-success-900">
                      {guarantee.releasedTo}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </DetailSection>
      </div>
    </div>
  );
}
