import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  DatabaseIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { useT } from '../../i18n/I18nProvider';
import { formatDateTime } from '../../lib/format';
import { getDb } from '../../lib/local-db/localDb';
import {
  getHealthStatusLabelKey,
  loadDatabaseHealthSnapshot,
} from '../../lib/sqlite/databaseHealth';
import { syncLocalDbToSqlite } from '../../lib/sqlite/syncLocalDbToSqlite';
import type {
  DatabaseHealthSnapshot,
  DatabaseHealthStatus,
  FullCollectionCounts,
} from '../../lib/sqlite/types';
import type { LabelKey } from '../../lib/i18n/simpleLabels';

const COLLECTION_LABEL_KEYS: Record<keyof FullCollectionCounts, LabelKey> = {
  profiles: 'dbHealthColProfiles',
  customers: 'dbHealthColCustomers',
  bikes: 'dbHealthColBikes',
  loans: 'dbHealthColLoans',
  loan_installments: 'dbHealthColLoanInstallments',
  loan_interest_cycles: 'dbHealthColLoanInterestCycles',
  loan_payments: 'dbHealthColPayments',
  payment_allocations: 'dbHealthColPaymentAllocations',
  documents: 'dbHealthColDocuments',
  receipts: 'dbHealthColReceipts',
  early_settlements: 'dbHealthColEarlySettlements',
  guarantees: 'dbHealthColGuarantees',
  audit_logs: 'dbHealthColAuditLogs',
  cash_transactions: 'dbHealthColCashTransactions',
  expenses: 'dbHealthColExpenses',
  business_settings: 'dbHealthColBusinessSettings',
  app_auth: 'dbHealthColAppAuth',
  counters: 'dbHealthColCounters',
};

function StatusBanner({
  status,
  label,
}: {
  status: DatabaseHealthStatus;
  label: string;
}) {
  if (status === 'healthy') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <CheckCircle2Icon className="h-6 w-6 shrink-0 text-emerald-600" />
        <div>
          <p className="font-semibold text-emerald-900">{label}</p>
        </div>
      </div>
    );
  }
  if (status === 'warning') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangleIcon className="h-6 w-6 shrink-0 text-amber-600" />
        <div>
          <p className="font-semibold text-amber-900">{label}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
      <XCircleIcon className="h-6 w-6 shrink-0 text-red-600" />
      <div>
        <p className="font-semibold text-red-900">{label}</p>
      </div>
    </div>
  );
}

export function DatabaseHealth() {
  const { t, language } = useT();
  const { showToast } = useToast();
  const [snapshot, setSnapshot] = useState<DatabaseHealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadDatabaseHealthSnapshot();
      setSnapshot(next);
    } catch {
      showToast(t('dbHealthLoadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const next = await loadDatabaseHealthSnapshot();
      setSnapshot(next);
      showToast(
        next.status === 'healthy'
          ? t('dbHealthVerifySuccess')
          : t('dbHealthVerifyDrift'),
        next.status === 'healthy' ? 'success' : 'warning'
      );
    } catch {
      showToast(t('dbHealthVerifyFailed'), 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleResync = async () => {
    setSyncing(true);
    try {
      const result = await syncLocalDbToSqlite(getDb());
      const next = await loadDatabaseHealthSnapshot();
      setSnapshot(next);
      if (result.ok) {
        showToast(t('dbHealthResyncSuccess'), 'success');
      } else {
        showToast(t('dbHealthResyncDrift'), 'warning');
      }
    } catch {
      showToast(t('dbHealthResyncFailed'), 'error');
    } finally {
      setSyncing(false);
    }
  };

  const health = snapshot?.health;
  const verification = snapshot?.verification;
  const fileStats = snapshot?.fileStats;
  const status = snapshot?.status ?? 'error';
  const statusLabel = t(getHealthStatusLabelKey(status));

  return (
    <div className="max-w-5xl mx-auto pb-24">
      <PageHeader
        title={t('dbHealthTitle')}
        subtitle={t('dbHealthSubtitle')}
        actions={
          <Link
            to="/settings"
            className="text-sm font-medium text-brand-700 hover:text-brand-800">
            {t('dbHealthBackToSettings')}
          </Link>
        }
      />

      {!snapshot?.desktopAvailable && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
          {t('dbHealthDesktopOnly')}
        </div>
      )}

      {snapshot?.desktopAvailable && (
        <>
          <div className="mb-6">
            <StatusBanner status={status} label={statusLabel} />
          </div>

          <div className="mb-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleVerify()}
              disabled={verifying || loading}
              className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50">
              <ShieldCheckIcon className="h-4 w-4" />
              {verifying ? t('dbHealthVerifying') : t('dbHealthVerifyButton')}
            </button>
            <button
              type="button"
              onClick={() => void handleResync()}
              disabled={syncing || loading}
              className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-800 disabled:opacity-50">
              <DatabaseIcon className="h-4 w-4" />
              {syncing ? t('dbHealthResyncing') : t('dbHealthResyncButton')}
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50">
              <RefreshCwIcon className="h-4 w-4" />
              {loading ? t('dbHealthRefreshing') : t('dbHealthRefreshButton')}
            </button>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MetricCard
              label={t('dbHealthLastSync')}
              value={
                health?.lastSyncAt
                  ? formatDateTime(health.lastSyncAt, language)
                  : t('dbHealthNever')
              }
            />
            <MetricCard
              label={t('dbHealthMigrationStatus')}
              value={
                health?.migrationCompleted
                  ? t('dbHealthMigrationCompleted')
                  : t('dbHealthMigrationPending')
              }
            />
            <MetricCard
              label={t('dbHealthSyncCount')}
              value={String(health?.syncCount ?? 0)}
            />
            <MetricCard
              label={t('dbHealthFileSize')}
              value={
                fileStats?.exists
                  ? `${fileStats.sizeMb} MB`
                  : t('dbHealthFileMissing')
              }
            />
          </div>

          <div className="mb-8 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-neutral-900">
              {t('dbHealthFilePath')}
            </h2>
            <p className="mt-2 break-all font-mono text-xs text-neutral-600">
              {fileStats?.path ?? health?.databasePath ?? '—'}
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-base font-semibold text-neutral-900">
                {t('dbHealthVerificationTitle')}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                {t('dbHealthVerificationHint')}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-700">
                      {t('dbHealthTableCollection')}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-neutral-700">
                      {t('dbHealthTableLocal')}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-neutral-700">
                      {t('dbHealthTableMirror')}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-700">
                      {t('dbHealthTableStatus')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {(verification?.rows ?? []).map((row) => (
                    <tr key={row.collection}>
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {t(COLLECTION_LABEL_KEYS[row.collection])}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-neutral-700">
                        {row.local}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-neutral-700">
                        {row.sqlite}
                      </td>
                      <td className="px-4 py-3">
                        {row.match ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2Icon className="h-4 w-4" />
                            {t('dbHealthRowOk')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <AlertTriangleIcon className="h-4 w-4" />
                            {t('dbHealthRowDrift')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-neutral-900">{value}</p>
    </div>
  );
}
