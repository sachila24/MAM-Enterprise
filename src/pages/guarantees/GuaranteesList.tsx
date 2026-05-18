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
import { useT } from '../../i18n/I18nProvider';

export function GuaranteesList() {
  const { t } = useT();
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
  const bikeHeld = guarantees.filter(
    (g) => g.type === 'BIKE' && g.status === 'held'
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
      g.guaranteeCode.toLowerCase().includes(search.toLowerCase()) ||
      (g.loan?.loanCode.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (g.customer?.name.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus =
    statusFilter === 'All' || g.status === statusFilter.toLowerCase();
    const matchesType = typeFilter === 'All' || g.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title={t('guarantees')}
        subtitle={t('guaranteesSubtitle')}
        actions={
        <button
          onClick={() => navigate('/guarantees/new')}
          className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
          
            <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            {t('addGuaranteeBtn')}
          </button>
        } />
      

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
        <KpiCard label={t('totalHeld')} value={totalHeld} />
        <KpiCard label={t('vehicleBooksKpi')} value={vehicleBooks} />
        <KpiCard label={t('gold')} value={gold} />
        <KpiCard label={t('electronics')} value={electronics} />
        <KpiCard label={t('bikesHeld')} value={bikeHeld} />
      </div>

      <FilterToolbar
        searchPlaceholder={t('searchGuaranteesPlaceholder')}
        onSearchChange={setSearch}
        filters={
        <>
            <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-32 rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6">
            
              <option value="All">{t('allStatus')}</option>
              <option value="held">{t('statusHeld')}</option>
              <option value="returned">{t('statusReturned')}</option>
            </select>
            <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="block w-40 rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6">
            
              <option value="All">{t('allTypes')}</option>
              <option value="VEHICLE_BOOK">{t('vehicleBook')}</option>
              <option value="GOLD">{t('gold')}</option>
              <option value="ELECTRONICS">{t('electronics')}</option>
              <option value="BIKE">{t('typeBike')}</option>
              <option value="OTHER">{t('statusOther')}</option>
            </select>
          </>
        } />
      

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-neutral-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">
                  {t('colCodeModel')} / {t('field.type')} / {t('field.description')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  {t('colLinkedTo')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  {t('storageLocation')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  {t('colReceived')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  {t('field.status')}
                </th>
                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {filteredGuarantees.map((g) => (
              <tr
                key={g.id}
                onClick={() => navigate(`/guarantees/${g.id}`)}
                className="cursor-pointer hover:bg-neutral-50 transition-colors">
                
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                    <div className="text-xs font-semibold text-brand-700 tabular-nums mb-1">
                      {g.guaranteeCode}
                    </div>
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
                        {g.customer?.name || t('misc.unknown')}
                      </span>
                      <ChevronRightIcon className="h-3 w-3 mx-1 text-neutral-400" />
                      <span className="font-semibold text-brand-600 tabular-nums">
                        {g.loan?.loanCode ?? '—'}
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/guarantees/${g.id}`);
                      }}
                      className="text-brand-600 hover:text-brand-900 font-semibold"
                    >
                      {t('action.view')}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredGuarantees.length === 0 &&
              <tr>
                  <td
                  colSpan={6}
                  className="py-10 text-center text-sm text-neutral-500">
                  
                    {t('noGuaranteesFound')}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>);

}