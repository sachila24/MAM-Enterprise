import React, { useRef, useState } from 'react';
import {
  DownloadIcon,
  RefreshCwIcon,
  DatabaseIcon,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { formatDateTime } from '../../lib/format';
import { downloadFullDatabaseBackup } from '../../lib/local-db/downloadBackup';
import { restoreDemoDbFromBackup } from '../../lib/local-db/localDb';
import {
  getBackupMeta,
  recordBackupDownload,
  recordBackupRestore,
} from '../../lib/local-db/backupMeta';
import { useT } from '../../i18n/I18nProvider';

export function Backup() {
  const { t, language } = useT();
  const { showToast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [meta, setMeta] = useState(() => getBackupMeta());
  const uploadRef = useRef<HTMLInputElement>(null);

  const refreshMeta = () => setMeta(getBackupMeta());

  const handleDownload = () => {
    setIsDownloading(true);
    try {
      downloadFullDatabaseBackup();
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
      restoreDemoDbFromBackup(raw);
      recordBackupRestore();
      refreshMeta();
      showToast(t('backupRestoreSuccess'), 'success');
      window.setTimeout(() => {
        window.location.reload();
      }, 150);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('backupRestoreFailed');
      showToast(message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title={t('nav.backup')} subtitle={t('backupSubtitle')} />

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
            onClick={handleDownload}
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
    </div>
  );
}
