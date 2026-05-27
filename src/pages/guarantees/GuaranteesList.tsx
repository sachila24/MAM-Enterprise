import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { KpiCard } from '../../components/ui/KpiCard';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import { StatusChip } from '../../components/ui/StatusChip';
import { formatDate } from '../../lib/format';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import {
  bikeRegistrationDisplay,
  formatBikeBrandModelLine,
} from '../../lib/display/bikeDisplay';
import {
  listBikes,
  listCustomers,
  listGuarantees,
  listLoans,
} from '../../lib/local-db/repositories';
import { useT } from '../../i18n/I18nProvider';
import type { Guarantee } from '../../types/entities';

function guaranteeFileNumber(g: Guarantee): string {
  return g.fileNumber?.trim() || '—';
}

function guaranteeVehicleNumber(g: Guarantee): string {
  return (g.vehicleNumber ?? g.itemReference)?.trim() || '—';
}

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
  const bikes = listBikes(db);
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
    const linkedBike = loan?.bikeId
      ? bikes.find((b) => b.id === loan.bikeId)
      : undefined;
    return {
      ...g,
      loan,
      customer,
      linkedBike,
    };
  });
  const filteredGuarantees = enrichedGuarantees.filter((g) => {
    const fileNum = g.fileNumber?.toLowerCase() ?? '';
    const vehicleNum = (g.vehicleNumber ?? g.itemReference)?.toLowerCase() ?? '';
    const matchesSearch =
      g.description.toLowerCase().includes(search.toLowerCase()) ||
      g.guaranteeCode.toLowerCase().includes(search.toLowerCase()) ||
      fileNum.includes(search.toLowerCase()) ||
      vehicleNum.includes(search.toLowerCase()) ||
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
            className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            {t('addGuaranteeBtn')}
          </button>
        }
      />

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
              className="block w-32 rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6"
            >
              <option value="All">{t('allStatus')}</option>
              <option value="held">{t('statusHeld')}</option>
              <option value="returned">{t('statusReturned')}</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="block w-40 rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6"
            >
              <option value="All">{t('allTypes')}</option>
              <option value="VEHICLE_BOOK">{t('vehicleBook')}</option>
              <option value="GOLD">{t('gold')}</option>
              <option value="ELECTRONICS">{t('electronics')}</option>
              <option value="BIKE">{t('typeBike')}</option>
              <option value="OTHER">{t('statusOther')}</option>
            </select>
          </>
        }
      />

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-neutral-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">
                  {t('fileNumber')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  {t('vehicleNumber')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  {t('colCustomer')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  {t('colLoanNumber')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  {t('colLinkedBike')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  {t('colReceived')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  {t('field.status')}
                </th>
                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">{t('action.view')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {filteredGuarantees.map((g) => (
                <tr
                  key={g.id}
                  onClick={() => navigate(`/guarantees/${g.id}`)}
                  className="cursor-pointer hover:bg-neutral-50 transition-colors"
                >
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-neutral-900 sm:pl-6 tabular-nums">
                    {guaranteeFileNumber(g)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-neutral-900 tabular-nums">
                    {guaranteeVehicleNumber(g)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900">
                    {g.customer?.name || t('misc.unknown')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-brand-600 tabular-nums">
                    {g.loan?.loanCode ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-700">
                    {g.linkedBike ? (
                      <>
                        <div className="font-medium text-neutral-900 tabular-nums">
                          {bikeRegistrationDisplay(g.linkedBike, t('notRegistered'))}
                        </div>
                        <div className="text-neutral-500">
                          {formatBikeBrandModelLine(g.linkedBike)}
                        </div>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500 tabular-nums">
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
              {filteredGuarantees.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-10 text-center text-sm text-neutral-500"
                  >
                    {t('noGuaranteesFound')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
