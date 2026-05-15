import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { KpiCard } from '../../components/ui/KpiCard';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import { StatusChip } from '../../components/ui/StatusChip';
import type { Customer, Loan, Payment } from '../../types/entities';
import { formatLKR, formatDate, formatEnum } from '../../lib/format';
export function PaymentsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const payments: Payment[] = [];
  const loans: Loan[] = [];
  const customers: Customer[] = [];
  const enrichedPayments = payments.map((p) => {
    const loan = loans.find((l) => l.id === p.loanId);
    const customer = loan
      ? customers.find((c) => c.id === loan.customerId)
      : undefined;
    return {
      ...p,
      customer
    };
  });
  const filteredPayments = enrichedPayments.filter((p) => {
    const matchesSearch =
    p.receiptNo.toLowerCase().includes(search.toLowerCase()) ||
    p.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
    p.loanId.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });
  // Mock KPIs
  const collectedToday = payments.
  filter((p) => p.paidAt.startsWith('2026-05-15')) // Mocking today
  .reduce((sum, p) => sum + p.amount, 0);
  const collectedThisWeek = payments.
  filter((p) => p.paidAt.startsWith('2026-05')) // Mocking week
  .reduce((sum, p) => sum + p.amount, 0);
  const pendingConfirmations = payments.filter(
    (p) => p.status === 'pending'
  ).length;
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Payments"
        actions={
        <button
          onClick={() => navigate('/payments/new')}
          className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
          
            <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Record Payment
          </button>
        } />
      

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <KpiCard label="Collected Today" value={formatLKR(collectedToday)} />
        <KpiCard
          label="Collected This Week"
          value={formatLKR(collectedThisWeek)} />
        
        <KpiCard
          label="Pending Confirmations"
          value={pendingConfirmations}
          delta={
          pendingConfirmations > 0 ?
          {
            value: 'Needs review',
            trend: 'neutral'
          } :
          undefined
          } />
        
      </div>

      <FilterToolbar
        onSearchChange={setSearch}
        searchPlaceholder="Search by Receipt, Customer, or Loan ID..." />
      

      <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">
                  Date
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  Receipt No
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  Customer
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  Loan ID
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                  Amount
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  Method
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {filteredPayments.map((p) =>
              <tr
                key={p.id}
                className="hover:bg-neutral-50 transition-colors">
                
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-neutral-500 sm:pl-6 tabular-nums">
                    {formatDate(p.paidAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-brand-600 tabular-nums">
                    {p.receiptNo}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900">
                    {p.customer?.name || 'Unknown'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500 tabular-nums">
                    {p.loanId}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900 text-right tabular-nums font-medium">
                    {formatLKR(p.amount)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                    {formatEnum(p.method)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <StatusChip status={p.status} />
                  </td>
                </tr>
              )}
              {filteredPayments.length === 0 &&
              <tr>
                  <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-sm text-neutral-500">
                  
                    No payments found matching your criteria.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>);

}