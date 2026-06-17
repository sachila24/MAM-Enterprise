import React, { useCallback, useRef, useState } from 'react';
import {
  DownloadIcon,
  RefreshCwIcon,
  DatabaseIcon,
  Trash2Icon,
  RotateCcwIcon,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { formatDateTime } from '../../lib/format';
import { downloadFullDatabaseBackup } from '../../lib/local-db/downloadBackup';
import {
  getBackupMeta,
  recordBackupDownload,
  recordBackupRestore,
} from '../../lib/local-db/backupMeta';
import { useT } from '../../i18n/I18nProvider';
import type { LabelKey } from '../../lib/i18n/simpleLabels';
import type { BackupType, DesktopBackupListEntry } from '../../lib/backup/types';
import {
  deleteDesktopBackup,
  isDesktopBackupAvailable,
  listDesktopBackups,
  readDesktopBackup,
  saveDesktopBackup,
} from '../../lib/backup/desktopBackupClient';
import { safeRestoreFromBackup } from '../../lib/backup/safeRestore';
import { formatBackupErrorMessage, formatFileSize } from '../../lib/backup/backupErrors';
import { getDb } from '../../lib/local-db/localDb';

function backupTypeLabelKey(type: BackupType): LabelKey {
  if (type === 'manual') return 'backupTypeManual';
  if (type === 'restore_point') return 'backupTypeRestorePoint';
  return 'backupTypeAuto';
}

export function Backup() {
  const { t, tf, language } = useT();
  const { showToast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [meta, setMeta] = useState(() => getBackupMeta());
  const [desktopBackups, setDesktopBackups] = useState<DesktopBackupListEntry[]>(
    []
  );
  const uploadRef = useRef<HTMLInputElement>(null);
  const desktopBackupEnabled = isDesktopBackupAvailable();

  const refreshMeta = () => setMeta(getBackupMeta());

  const refreshDesktopList = useCallback(async () => {
    if (!desktopBackupEnabled) {
      setDesktopBackups([]);
      return;
    }
    setIsLoadingList(true);
    try {
      const rows = await listDesktopBackups();
      setDesktopBackups(rows.filter((r) => r.backupType !== 'restore_point'));
    } catch {
      setDesktopBackups([]);
      showToast(t('backupListLoadFailed'), 'error');
    } finally {
      setIsLoadingList(false);
    }
  }, [desktopBackupEnabled, showToast, t]);

  React.useEffect(() => {
    void refreshDesktopList();
  }, [refreshDesktopList]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      downloadFullDatabaseBackup();
      if (desktopBackupEnabled) {
        await saveDesktopBackup(getDb(), 'manual');
        await refreshDesktopList();
      }
      recordBackupDownload();
      refreshMeta();
      showToast(t('backupDownloadSuccess'), 'success');
    } catch {
      showToast(t('backupDownloadFailed'), 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUploadClick = () => {
    if (isUploading) return;
    uploadRef.current?.click();
  };

  const reloadAfterRestore = () => {
    recordBackupRestore();
    refreshMeta();
    showToast(t('backupRestoreSuccess'), 'success');
    window.setTimeout(() => {
      window.location.reload();
    }, 150);
  };

  const handleUploadBackup = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const isJson = file.name.toLowerCase().endsWith('.json');
    if (!isJson) {
      showToast(t('backupInvalidFileType'), 'error');
      return;
    }

    setIsUploading(true);
    try {
      const raw = await file.text();
      if (!window.confirm(t('backupRestoreConfirm'))) {
        return;
      }
      await safeRestoreFromBackup(raw);
      reloadAfterRestore();
    } catch (error) {
      showToast(formatBackupErrorMessage(error, t), 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRestoreDesktop = async (entry: DesktopBackupListEntry) => {
    if (restoringId) return;
    if (!window.confirm(t('backupRestoreFromListConfirm'))) return;

    setRestoringId(entry.id);
    try {
      const raw = await readDesktopBackup(entry.id);
      await safeRestoreFromBackup(raw);
      reloadAfterRestore();
    } catch (error) {
      showToast(formatBackupErrorMessage(error, t), 'error');
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteDesktop = async (entry: DesktopBackupListEntry) => {
    if (deletingId) return;
    if (!window.confirm(t('backupDeleteConfirm'))) return;

    setDeletingId(entry.id);
    try {
      await deleteDesktopBackup(entry.id);
      await refreshDesktopList();
      showToast(t('backupDeleteSuccess'), 'success');
    } catch {
      showToast(t('backupDeleteFailed'), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader title={t('nav.backup')} subtitle={t('backupSubtitle')} />

      {desktopBackupEnabled && (
        <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            {t('backupDesktopTitle')}
          </h3>
          <p className="text-sm text-neutral-500 mb-4">{t('backupAutoHint')}</p>
          <p className="text-sm text-neutral-500">{t('backupDesktopHint')}</p>
        </div>
      )}

      <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
          {t('manualLocalBackup')}
        </h3>
        <p className="text-sm text-neutral-500 mb-6">{t('manualBackupHint')}</p>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
          <div className="rounded-lg bg-neutral-50 px-4 py-3 ring-1 ring-neutral-200">
            <dt className="font-medium text-neutral-500">{t('lastBackupAt')}</dt>
            <dd className="mt-1 font-semibold text-neutral-900 tabular-nums">
              {meta.lastBackupAt
                ? formatDateTime(meta.lastBackupAt, language)
                : t('backupNever')}
            </dd>
          </div>
          <div className="rounded-lg bg-neutral-50 px-4 py-3 ring-1 ring-neutral-200">
            <dt className="font-medium text-neutral-500">{t('lastRestoreAt')}</dt>
            <dd className="mt-1 font-semibold text-neutral-900 tabular-nums">
              {meta.lastRestoreAt
                ? formatDateTime(meta.lastRestoreAt, language)
                : t('backupNever')}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={isDownloading || isUploading}
            className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 disabled:opacity-50"
          >
            {isDownloading ? (
              <RefreshCwIcon className="-ml-0.5 h-5 w-5 animate-spin" />
            ) : (
              <DatabaseIcon className="-ml-0.5 h-5 w-5" />
            )}
            {isDownloading ? t('preparingFiles') : t('downloadFullBackup')}
          </button>
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={isUploading || isDownloading}
            className="inline-flex items-center gap-x-2 rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
          >
            {isUploading ? (
              <RefreshCwIcon className="-ml-0.5 h-5 w-5 animate-spin" />
            ) : (
              <DownloadIcon className="-ml-0.5 h-5 w-5 rotate-180" />
            )}
            {isUploading ? t('backupUploading') : t('uploadBackup')}
          </button>
          <input
            ref={uploadRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleUploadBackup}
          />
        </div>
      </div>

      {desktopBackupEnabled && (
        <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden">
          <div className="border-b border-neutral-200 px-4 py-5 sm:px-6 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-neutral-900">
                {t('backupManagementTitle')}
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                {t('backupManagementHint')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshDesktopList()}
              disabled={isLoadingList}
              className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-2 text-sm font-medium text-neutral-700 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
            >
              <RefreshCwIcon
                className={`h-4 w-4 ${isLoadingList ? 'animate-spin' : ''}`}
              />
              {t('backupRefreshList')}
            </button>
          </div>

          {desktopBackups.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-neutral-500">
              {isLoadingList ? t('backupListLoading') : t('backupNoDesktopBackups')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-neutral-500">
                      {t('backupDate')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-500">
                      {t('backupTypeLabel')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-500">
                      {t('backupSize')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-500">
                      {t('backupCountsLabel')}
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-neutral-500">
                      {t('backupActions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {desktopBackups.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums text-neutral-900">
                        {entry.createdAt
                          ? formatDateTime(entry.createdAt, language)
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">
                        {t(backupTypeLabelKey(entry.backupType))}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-neutral-700">
                        {formatFileSize(entry.sizeBytes)}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 text-xs">
                        {tf('backupCountsSummary', {
                          bikes: entry.counts.bikes,
                          customers: entry.counts.customers,
                          loans: entry.counts.loans,
                          payments: entry.counts.payments,
                          documents: entry.counts.documents,
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void handleRestoreDesktop(entry)}
                            disabled={
                              restoringId === entry.id || deletingId === entry.id
                            }
                            className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50"
                          >
                            {restoringId === entry.id ? (
                              <RefreshCwIcon className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCcwIcon className="h-3.5 w-3.5" />
                            )}
                            {t('backupRestore')}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteDesktop(entry)}
                            disabled={
                              restoringId === entry.id || deletingId === entry.id
                            }
                            className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-danger-700 ring-1 ring-inset ring-danger-200 hover:bg-danger-50 disabled:opacity-50"
                          >
                            {deletingId === entry.id ? (
                              <RefreshCwIcon className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2Icon className="h-3.5 w-3.5" />
                            )}
                            {t('backupDelete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
