import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { KpiCard } from '../../components/ui/KpiCard';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import { StatusChip } from '../../components/ui/StatusChip';
import type { Customer, Loan } from '../../types/entities';
import { formatLKR, formatDate, formatEnum } from '../../lib/format';
import { useT } from '../../i18n/I18nProvider';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import { listCustomers, listLoans } from '../../lib/local-db/repositories';

export function LoansList() {
  const { t } = useT();
  const navigate = useNavigate();
  const db = useDemoDb();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const loans = listLoans(db);
  const customers = listCustomers(db);
  const enrichedLoans = loans.map((loan) => ({
    ...loan,
    customer: customers.find((c) => c.id === loan.customerId),
  }));
  const filteredLoans = enrichedLoans.filter((loan) => {
    const matchesSearch =
    loan.loanCode.toLowerCase().includes(search.toLowerCase()) ||
    loan.customer?.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      loan.status.toLowerCase() === statusFilter;
    const matchesType =
      typeFilter === 'all' ||
      loan.loanPurpose.toLowerCase().replace('_', '') === typeFilter.replace('_', '') ||
      (typeFilter === 'cash' && loan.loanPurpose === 'CASH_LOAN') ||
      (typeFilter === 'bike' && loan.loanPurpose === 'BIKE_INSTALLMENT');
    return matchesSearch && matchesStatus && matchesType;
  });
  const activeLoans = loans.filter((l) => l.status === 'ACTIVE').length;
  const outstandingPortfolio = loans.reduce((sum, l) => sum + l.balanceAmount, 0);
  const overdueLoans = loans.filter((l) => l.status === 'OVERDUE').length;
  const completedThisMonth = loans.filter(
    (l) =>
      (l.status === 'COMPLETED' || l.status === 'SETTLED') &&
      l.startDate.startsWith(new Date().toISOString().slice(0, 7))
  ).length;
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title={t('nav.loans')}
        subtitle="All cash loans and bike installment loans"
        actions={
        <button
          onClick={() => navigate('/loans/new')}
          className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
          
            <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            New loan
          </button>
        } />
      

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <KpiCard label="Total Active Loans" value={activeLoans} />
        <KpiCard
          label="Outstanding Portfolio"
          value={formatLKR(outstandingPortfolio)} />
        
        <KpiCard
          label="Overdue Loans"
          value={overdueLoans}
          delta={
          overdueLoans > 0 ?
          {
            value: 'Needs attention',
            trend: 'down'
          } :
          undefined
          } />
        
        <KpiCard label="Completed This Month" value={completedThisMonth} />
      </div>

      <FilterToolbar
        onSearchChange={setSearch}
        searchPlaceholder="Search by ID or Customer..."
        filters={
        <>
            <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block rounded-md border-0 py-1.5 pl-3 pr-8 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 bg-white">
            
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
            </select>
            <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="block rounded-md border-0 py-1.5 pl-3 pr-8 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 bg-white">
            
              <option value="all">All Types</option>
              <option value="cash">Cash</option>
              <option value="bike">Bike</option>
            </select>
          </>
        } />
      

      <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">
                  
                  Loan ID
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  
                  Customer
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  
                  Type
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                  
                  Amount
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                  
                  Balance
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  
                  Status
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  
                  Start Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {filteredLoans.map((loan) =>
              <tr
                key={loan.id}
                onClick={() => navigate(`/loans/${loan.id}`)}
                className="cursor-pointer hover:bg-neutral-50 transition-colors">
                
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-600 sm:pl-6 tabular-nums">
                    {loan.loanCode}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900">
                    {loan.customer?.name || 'Unknown'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                    {formatEnum(loan.loanPurpose)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900 text-right tabular-nums">
                    {formatLKR(loan.principalAmount)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900 text-right tabular-nums font-medium">
                    {formatLKR(loan.balanceAmount)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <StatusChip status={loan.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500 tabular-nums">
                    {formatDate(loan.startDate)}
                  </td>
                </tr>
              )}
              {filteredLoans.length === 0 &&
              <tr>
                  <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-sm text-neutral-500">
                  
                    No loans found matching your criteria.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>);

}