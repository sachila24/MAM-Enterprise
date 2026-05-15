import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, ChevronRightIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { KpiCard } from '../../components/ui/KpiCard';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import { StatusChip } from '../../components/ui/StatusChip';
import { formatEnum, formatDate } from '../../lib/format';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import {
  listCustomers,
  listGuarantees,
  listLoans,
} from '../../lib/local-db/repositories';

export function GuaranteesList() {
  const navigate = useNavigate();
  const db = useDemoDb();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const guarantees = listGuarantees(db);
  const loans = listLoans(db);
  const customers = listCustomers(db);
  const totalHeld = guarantees.filter((g) => g.status === 'held').length;
  const vehicleBooks = guarantees.filter(
    (g) => g.type === 'VEHICLE_BOOK' && g.status === 'held'
  ).length;
  const gold = guarantees.filter(
    (g) => g.type === 'GOLD' && g.status === 'held'
  ).length;
  const electronics = guarantees.filter(
    (g) => g.type === 'ELECTRONICS' && g.status === 'held'
  ).length;
  const enrichedGuarantees = guarantees.map((g) => {
    const loan = loans.find((l) => l.id === g.loanId);
    const customer = loan
      ? customers.find((c) => c.id === loan.customerId)
      : null;
    return {
      ...g,
      loan,
      customer
    };
  });
  const filteredGuarantees = enrichedGuarantees.filter((g) => {
    const matchesSearch =
    g.description.toLowerCase().includes(search.toLowerCase()) ||
    g.loanId.toLowerCase().includes(search.toLowerCase()) ||
    (g.customer?.name.toLowerCase() || '').includes(search.toLowerCase());
    const matchesStatus =
    statusFilter === 'All' || g.status === statusFilter.toLowerCase();
    const matchesType = typeFilter === 'All' || g.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Guarantees"
        subtitle="Items held as collateral for loans"
        actions={
        <button
          onClick={() => navigate('/guarantees/new')}
          className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
          
            <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Add guarantee
          </button>
        } />
      

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <KpiCard label="Total Held" value={totalHeld} />
        <KpiCard label="Vehicle Books" value={vehicleBooks} />
        <KpiCard label="Gold" value={gold} />
        <KpiCard label="Electronics" value={electronics} />
      </div>

      <FilterToolbar
        searchPlaceholder="Search description, customer, loan..."
        onSearchChange={setSearch}
        filters={
        <>
            <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-32 rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6">
            
              <option value="All">All Status</option>
              <option value="held">Held</option>
              <option value="released">Released</option>
            </select>
            <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="block w-40 rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6">
            
              <option value="All">All Types</option>
              <option value="VEHICLE_BOOK">Vehicle Book</option>
              <option value="GOLD">Gold</option>
              <option value="ELECTRONICS">Electronics</option>
              <option value="OTHER">Other</option>
            </select>
          </>
        } />
      

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-neutral-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">
                  Type & Description
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  Linked To
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  Storage Location
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  Received
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
              {filteredGuarantees.map((g) =>
              <tr
                key={g.id}
                className="hover:bg-neutral-50 transition-colors">
                
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600 ring-1 ring-inset ring-neutral-500/10">
                        {formatEnum(g.type)}
                      </span>
                    </div>
                    <div className="text-neutral-900 font-medium truncate max-w-xs">
                      {g.description}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                    <div className="flex items-center text-xs">
                      <span className="font-medium text-neutral-900">
                        {g.customer?.name || 'Unknown'}
                      </span>
                      <ChevronRightIcon className="h-3 w-3 mx-1 text-neutral-400" />
                      <span className="font-mono text-brand-600">
                        {g.loanId}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                    {g.storageLocation}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                    {formatDate(g.receivedAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                    <StatusChip status={g.status} />
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    {g.status === 'held' &&
                  <button className="text-brand-600 hover:text-brand-900">
                        Release
                      </button>
                  }
                  </td>
                </tr>
              )}
              {filteredGuarantees.length === 0 &&
              <tr>
                  <td
                  colSpan={6}
                  className="py-10 text-center text-sm text-neutral-500">
                  
                    No guarantees found matching your criteria.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>);

}