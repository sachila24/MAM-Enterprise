import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import { StatusChip } from '../../components/ui/StatusChip';
import { formatLKR, formatDate } from '../../lib/format';
import { PrinterIcon, XCircleIcon } from 'lucide-react';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import { listReceipts } from '../../lib/local-db/repositories';
import { useT } from '../../i18n/I18nProvider';

export function ReceiptsList() {
  const { t } = useT();
  const db = useDemoDb();
  const [search, setSearch] = useState('');
  const receipts = listReceipts(db);
  const filteredReceipts = receipts.filter((r) => {
    const matchesSearch =
    r.receiptNo.toLowerCase().includes(search.toLowerCase()) ||
    r.customer?.name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });
  const handleVoid = (id: string) => {
    if (
      window.confirm(t('voidReceiptNotImplemented'))
    ) {
      void id;
    }
  };
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title={t('nav.receipts')}
        subtitle={t('receiptsSubtitle')} />
      

      <FilterToolbar
        onSearchChange={setSearch}
        searchPlaceholder={t('searchReceipts')} />
      

      <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">
                  {t('colReceiptNo')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  {t('colDate')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  {t('field.customer')}
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                  {t('colAmount')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  {t('field.status')}
                </th>
                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">{t('colActions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {filteredReceipts.map((r) =>
              <tr
                key={r.id}
                className="hover:bg-neutral-50 transition-colors">
                
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-600 sm:pl-6 tabular-nums">
                    {r.receiptNo}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500 tabular-nums">
                    {formatDate(r.paidAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900">
                    {r.customer?.name || t('misc.unknown')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900 text-right tabular-nums font-medium">
                    {formatLKR(r.amount)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <StatusChip status={r.status} />
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex justify-end gap-2">
                      <button
                      onClick={() => window.print()}
                      className="text-neutral-400 hover:text-brand-600"
                      title={t('printReceiptTitle')}>
                      
                        <PrinterIcon className="h-5 w-5" />
                      </button>
                      {r.status === 'confirmed' &&
                    <button
                      onClick={() => handleVoid(r.id)}
                      className="text-neutral-400 hover:text-danger-600"
                      title={t('voidReceiptTitle')}>
                      
                          <XCircleIcon className="h-5 w-5" />
                        </button>
                    }
                    </div>
                  </td>
                </tr>
              )}
              {filteredReceipts.length === 0 &&
              <tr>
                  <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-sm text-neutral-500">
                  
                    {t('noReceiptsFound')}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>);

}