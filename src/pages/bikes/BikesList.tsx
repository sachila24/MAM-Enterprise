import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, LayoutGridIcon, ListIcon, BikeIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { KpiCard } from '../../components/ui/KpiCard';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import { StatusChip } from '../../components/ui/StatusChip';
import { formatLKR } from '../../lib/format';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import { listBikes } from '../../lib/local-db/repositories';
import { useT } from '../../i18n/I18nProvider';

export function BikesList() {
  const { t } = useT();
  const navigate = useNavigate();
  const db = useDemoDb();
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const bikes = listBikes(db);
  const totalBikes = bikes.length;
  const inStock = bikes.filter((b) => b.status === 'in_stock').length;
  const sold = bikes.filter((b) => b.status === 'sold').length;
  const held = bikes.filter((b) => b.status === 'held').length;
  const filteredBikes = bikes.filter((bike) => {
    const matchesSearch =
      bike.model.toLowerCase().includes(search.toLowerCase()) ||
      bike.chassisNo.toLowerCase().includes(search.toLowerCase()) ||
      bike.engineNo.toLowerCase().includes(search.toLowerCase()) ||
      (bike.bikeCode?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus =
    statusFilter === 'All' || bike.status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title={t('bikeStock')}
        subtitle={t('bikeStockSubtitle')}
        actions={
        <button
          onClick={() => navigate('/bikes/new')}
          className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
          
            <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            {t('addBike')}
          </button>
        } />
      

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <KpiCard label={t('totalBikes')} value={totalBikes} />
        <KpiCard label={t('inStock')} value={inStock} />
        <KpiCard label={t('sold')} value={sold} />
        <KpiCard label={t('heldAsGuarantee')} value={held} />
      </div>

      <FilterToolbar
        searchPlaceholder={t('searchBikes')}
        onSearchChange={setSearch}
        filters={
        <>
            <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-40 rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6">
            
              <option value="All">{t('allStatuses')}</option>
              <option value="in_stock">{t('statusInStock')}</option>
              <option value="sold">{t('statusSold')}</option>
              <option value="held">{t('statusHeld')}</option>
            </select>
            <div className="flex items-center rounded-md shadow-sm ring-1 ring-inset ring-neutral-300 bg-white ml-auto">
              <button
              type="button"
              onClick={() => setView('table')}
              className={`px-3 py-1.5 text-sm font-medium rounded-l-md ${view === 'table' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}>
              
                <ListIcon className="h-5 w-5" />
              </button>
              <button
              type="button"
              onClick={() => setView('grid')}
              className={`px-3 py-1.5 text-sm font-medium rounded-r-md ${view === 'grid' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}>
              
                <LayoutGridIcon className="h-5 w-5" />
              </button>
            </div>
          </>
        } />
      

      {view === 'table' ?
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-neutral-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">
                    {t('colCodeModel')}
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                    {t('colChassisEngine')}
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                    {t('colYearColor')}
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                    {t('colPrice')}
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                    {t('field.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {filteredBikes.map((bike) =>
              <tr
                key={bike.id}
                onClick={() => navigate(`/bikes/${bike.id}`)}
                className="cursor-pointer hover:bg-neutral-50 transition-colors group">
                
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                      <div className="text-xs font-semibold text-brand-700 tabular-nums">
                        {bike.bikeCode}
                      </div>
                      <div className="font-medium text-neutral-900">{bike.model}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                      <div className="font-mono text-xs">{bike.chassisNo}</div>
                      <div className="font-mono text-xs text-neutral-400">
                        {bike.engineNo}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                      {bike.year} • {bike.color}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900 text-right tabular-nums font-medium">
                      {formatLKR(bike.sellingPrice)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                      <StatusChip status={bike.status} />
                    </td>
                  </tr>
              )}
                {filteredBikes.length === 0 &&
              <tr>
                    <td
                  colSpan={5}
                  className="py-10 text-center text-sm text-neutral-500">
                  
                      {t('noBikesFound')}
                    </td>
                  </tr>
              }
              </tbody>
            </table>
          </div>
        </div> :

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBikes.map((bike) =>
        <div
          key={bike.id}
          onClick={() => navigate(`/bikes/${bike.id}`)}
          className="group cursor-pointer overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-neutral-200 hover:ring-brand-500 transition-all">
          
              <div className="aspect-video bg-neutral-100 flex items-center justify-center">
                <BikeIcon className="h-12 w-12 text-neutral-300" />
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div>
                    <div className="text-xs font-semibold text-brand-700 tabular-nums">
                      {bike.bikeCode}
                    </div>
                    <h3 className="text-sm font-semibold text-neutral-900 line-clamp-1 mt-0.5">
                      {bike.model}
                    </h3>
                  </div>
                  <StatusChip status={bike.status} showDot={false} />
                </div>
                <div className="text-xs text-neutral-500 font-mono mb-3">
                  {bike.chassisNo}
                </div>
                <div className="text-sm font-medium text-neutral-900 tabular-nums">
                  {formatLKR(bike.sellingPrice)}
                </div>
              </div>
            </div>
        )}
        </div>
      }
    </div>);

}