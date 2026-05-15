import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import { StatusChip } from '../../components/ui/StatusChip';
import type { Customer, Payment } from '../../types/entities';

type ReceiptRow = Payment & { customer?: Customer };
import { formatLKR, formatDate } from '../../lib/format';
import { PrinterIcon, XCircleIcon } from 'lucide-react';
export function ReceiptsList() {
  const [search, setSearch] = useState('');
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const filteredReceipts = receipts.filter((r) => {
    const matchesSearch =
    r.receiptNo.toLowerCase().includes(search.toLowerCase()) ||
    r.customer?.name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });
  const handleVoid = (id: string) => {
    if (
    window.confirm(
      'Are you sure you want to void this receipt? This action cannot be undone.'
    ))
    {
      setReceipts(
        receipts.map((r) =>
        r.id === id ?
        {
          ...r,
          status: 'voided'
        } :
        r
        )
      );
    }
  };
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Receipts"
        subtitle="View and manage payment receipts" />
      

      <FilterToolbar
        onSearchChange={setSearch}
        searchPlaceholder="Search by Receipt No or Customer..." />
      

      <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">
                  Receipt No
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  Date
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  Customer
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                  Amount
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  Status
                </th>
                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Actions</span>
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
                    {r.customer?.name || 'Unknown'}
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
                      title="Print Receipt">
                      
                        <PrinterIcon className="h-5 w-5" />
                      </button>
                      {r.status === 'confirmed' &&
                    <button
                      onClick={() => handleVoid(r.id)}
                      className="text-neutral-400 hover:text-danger-600"
                      title="Void Receipt">
                      
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
                  
                    No receipts found matching your criteria.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>);

}