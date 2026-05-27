import React, { useRef, useState } from 'react';
import {
  CloudIcon,
  DownloadIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  DatabaseIcon,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { formatDateTime, formatEnum } from '../../lib/format';
import { downloadFullDatabaseBackup } from '../../lib/local-db/downloadBackup';
import { restoreDemoDbFromBackup } from '../../lib/local-db/localDb';
import { useT } from '../../i18n/I18nProvider';

const backupHistory = [
  {
    id: 1,
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    size: '4.2 MB',
    type: 'Manual',
    user: 'Sachila',
  },
  {
    id: 2,
    date: new Date(Date.now() - 86400000 * 7).toISOString(),
    size: '4.1 MB',
    type: 'Auto',
    user: 'System',
  },
  {
    id: 3,
    date: new Date(Date.now() - 86400000 * 14).toISOString(),
    size: '3.9 MB',
    type: 'Auto',
    user: 'System',
  },
];

export function Backup() {
  const { t, language } = useT();
  const { showToast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const handleDownload = () => {
    setIsDownloading(true);
    try {
      downloadFullDatabaseBackup();
      showToast('Backup downloaded successfully', 'success');
    } catch {
      showToast('Backup download failed. Please try again.', 'error');
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
    // Clear value so selecting the same file again retriggers onChange.
    event.target.value = '';
    if (!file) return;

    const isJson = file.name.toLowerCase().endsWith('.json');
    if (!isJson) {
      showToast('Please select a .json backup file.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const raw = await file.text();
      if (!window.confirm('Restore backup and replace all current demo data?')) {
        return;
      }
      restoreDemoDbFromBackup(raw);
      showToast('Backup restored successfully', 'success');
      window.setTimeout(() => {
        window.location.reload();
      }, 150);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Backup restore failed.';
      showToast(message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title={t('nav.backup')} subtitle={t('backupSubtitle')} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-1">
          <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-success-50 flex items-center justify-center">
                <CloudIcon className="h-6 w-6 text-success-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">
                  {t('cloudSync')}
                </h3>
                <div className="flex items-center gap-1 text-sm text-success-600 font-medium">
                  <CheckCircleIcon className="h-4 w-4" />
                  {t('cloudSyncActive')}
                </div>
              </div>
            </div>
            <p className="text-sm text-neutral-500 mb-6">{t('cloudSyncHint')}</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">{t('lastSynced')}</span>
                <span className="text-neutral-900 font-medium">{t('justNow')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">{t('storageUsed')}</span>
                <span className="text-neutral-900 font-medium">12.4 MB</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-6 h-full flex flex-col justify-center">
            <div className="max-w-xl">
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                {t('manualLocalBackup')}
              </h3>
              <p className="text-sm text-neutral-500 mb-6">{t('manualBackupHint')}</p>
              <button
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
                className="ml-3 inline-flex items-center gap-x-2 rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
              >
                {isUploading ? (
                  <RefreshCwIcon className="-ml-0.5 h-5 w-5 animate-spin" />
                ) : (
                  <DownloadIcon className="-ml-0.5 h-5 w-5 rotate-180" />
                )}
                {isUploading ? 'Uploading...' : 'Upload Backup'}
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
      </div>

      <h3 className="text-lg font-semibold text-neutral-900 mb-4">
        {t('recentBackups')}
      </h3>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-neutral-200">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">
                {t('dateAndTime')}
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                {t('field.type')}
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                {t('initiatedBy')}
              </th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                {t('backupSize')}
              </th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">{t('colActions')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white">
            {backupHistory.map((backup) => (
              <tr key={backup.id} className="hover:bg-neutral-50">
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-neutral-900 sm:pl-6">
                  {formatDateTime(backup.date)}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      backup.type === 'Auto'
                        ? 'bg-info-50 text-info-700 ring-info-500/20'
                        : 'bg-neutral-50 text-neutral-600 ring-neutral-500/10'
                    }`}
                  >
                    {formatEnum(backup.type, language)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                  {backup.user === 'System' ? t('systemUser') : backup.user}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500 text-right tabular-nums">
                  {backup.size}
                </td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                  <button
                    type="button"
                    className="text-brand-600 hover:text-brand-900"
                    aria-label={t('downloadFullBackup')}
                  >
                    <DownloadIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
