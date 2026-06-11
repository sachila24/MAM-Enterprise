import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, UsersIcon, BanknoteIcon, PieChartIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { KpiCard } from '../../components/ui/KpiCard';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import { StatusChip } from '../../components/ui/StatusChip';
import { formatLKR } from '../../lib/format';
import type { Customer } from '../../types/entities';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import { listCustomers } from '../../lib/local-db/repositories';
import { useT } from '../../i18n/I18nProvider';

export function CustomerList() {
  const { t } = useT();
  const navigate = useNavigate();
  const db = useDemoDb();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const customers = listCustomers(db);
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.nic.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const totalCustomers = customers.length;
  const activeLoans = customers.reduce((sum, c) => sum + c.activeLoans, 0);
  const totalOutstanding = customers.reduce(
    (sum, c) => sum + c.outstandingBalance,
    0
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('customers')}
        actions={
        <Link
          to="/customers/new"
          className="inline-flex items-center gap-x-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
          
            <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            {t('addCustomer')}
          </Link>
        } />
      

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label={t('totalCustomers')}
          value={totalCustomers}
          icon={UsersIcon} />
        
        <KpiCard label={t('activeLoans')} value={activeLoans} icon={BanknoteIcon} />
        <KpiCard
          label={t('totalOutstanding')}
          value={formatLKR(totalOutstanding)}
          icon={PieChartIcon} />
        
      </div>

      <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-neutral-200">
          <FilterToolbar
            onSearchChange={setSearch}
            searchPlaceholder={t('searchCustomers')}
            filters={
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 bg-white">
              
                <option value="all">{t('allStatuses')}</option>
                <option value="active">{t('statusActive')}</option>
                <option value="inactive">{t('statusInactive')}</option>
              </select>
            } />
          
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">
                  
                  {t('field.name')}
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  
                  {t('colNic')}
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  
                  {t('field.phone')}
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  
                  {t('field.status')}
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                  
                  {t('colActiveLoans')}
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                  
                  {t('colOutstanding')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {filteredCustomers.map((customer) =>
              <tr
                key={customer.id}
                onClick={() => navigate(`/customers/${customer.id}`)}
                className="hover:bg-neutral-50 cursor-pointer transition-colors">
                
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-neutral-900 sm:pl-6">
                    {customer.name}
                    {customer.customerCode && (
                      <div className="text-xs text-neutral-500 font-normal mt-0.5 tabular-nums">
                        {customer.customerCode}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500 tabular-nums">
                    {customer.nic}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500 tabular-nums">
                    {customer.phone}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <StatusChip status={customer.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500 text-right tabular-nums">
                    {customer.activeLoans}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-neutral-900 text-right tabular-nums">
                    {formatLKR(customer.outstandingBalance)}
                  </td>
                </tr>
              )}
              {filteredCustomers.length === 0 &&
              <tr>
                  <td
                  colSpan={6}
                  className="py-10 text-center text-sm text-neutral-500">
                  
                    {customers.length === 0
                      ? t('noCustomersYet')
                      : t('noCustomersFilterMatch')}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>);

}