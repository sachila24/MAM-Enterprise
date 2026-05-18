import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { KpiCard } from '../../components/ui/KpiCard';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import { StatusChip } from '../../components/ui/StatusChip';
import { formatLKR, formatDate, formatEnum } from '../../lib/format';
import { useT } from '../../i18n/I18nProvider';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import {
  listCustomers,
  listLoans,
  listLoanPayments,
} from '../../lib/local-db/repositories';

export function PaymentsList() {
  const { t } = useT();
  const navigate = useNavigate();
  const db = useDemoDb();
  const [search, setSearch] = useState('');
  const payments = listLoanPayments(db);
  const loans = listLoans(db);
  const customers = listCustomers(db);
  const today = new Date().toISOString().split('T')[0];
  const monthPrefix = today.slice(0, 7);
  const enrichedPayments = payments.map((p) => {
    const loan = loans.find((l) => l.id === p.loanId);
    const customer = customers.find((c) => c.id === p.customerId);
    return {
      ...p,
      loan,
      customer,
    };
  });
  const filteredPayments = enrichedPayments.filter((p) => {
    const loanCode = p.loan?.loanCode ?? '';
    const matchesSearch =
      p.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
      loanCode.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });
  // Mock KPIs
  const collectedToday = payments
    .filter((p) => p.paymentDate === today && p.status === 'CONFIRMED')
    .reduce((sum, p) => sum + p.amount, 0);
  const collectedThisWeek = payments
    .filter((p) => p.paymentDate.startsWith(monthPrefix) && p.status === 'CONFIRMED')
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingConfirmations = payments.filter(
    (p) => p.status !== 'CONFIRMED'
  ).length;
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title={t('payments')}
        actions={
        <button
          onClick={() => navigate('/payments/new')}
          className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
          
            <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            {t('recordPayment')}
          </button>
        } />
      

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <KpiCard label={t('collectedToday')} value={formatLKR(collectedToday)} />
        <KpiCard
          label={t('collectedThisWeek')}
          value={formatLKR(collectedThisWeek)} />
        
        <KpiCard
          label={t('pendingConfirmations')}
          value={pendingConfirmations}
          delta={
          pendingConfirmations > 0 ?
          {
            value: t('needsReview'),
            trend: 'neutral'
          } :
          undefined
          } />
        
      </div>

      <FilterToolbar
        onSearchChange={setSearch}
        searchPlaceholder={t('searchPayments')} />
      

      <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">
                  {t('colDate')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  {t('colReceiptNo')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  {t('field.customer')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  {t('field.loan')}
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                  {t('colCash')}
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                  {t('colDiscount')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  {t('field.method')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  {t('field.status')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {filteredPayments.map((p) =>
              <tr
                key={p.id}
                className="hover:bg-neutral-50 transition-colors">
                
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-neutral-500 sm:pl-6 tabular-nums">
                    {formatDate(p.paymentDate)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-brand-600 tabular-nums">
                    {p.receiptNumber}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900">
                    {p.customer?.name || t('misc.unknown')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-mono text-brand-700 tabular-nums">
                    {p.loan?.loanCode ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900 text-right tabular-nums font-medium">
                    {formatLKR(p.amount)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-600 text-right tabular-nums">
                    {p.discountAmount > 0 ? formatLKR(p.discountAmount) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                    {formatEnum(p.paymentMethod)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <StatusChip
                      status={p.status === 'CONFIRMED' ? 'confirmed' : 'pending'}
                    />
                  </td>
                </tr>
              )}
              {filteredPayments.length === 0 &&
              <tr>
                  <td
                  colSpan={8}
                  className="px-3 py-8 text-center text-sm text-neutral-500">
                  
                    {t('noPaymentsFound')}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>);

}