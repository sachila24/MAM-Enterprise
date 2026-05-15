import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BikeIcon, EditIcon, CheckIcon, Trash2Icon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusChip } from '../../components/ui/StatusChip';
import { KpiCard } from '../../components/ui/KpiCard';
import { EmptyState } from '../../components/ui/EmptyState';
import type { Bike, Loan } from '../../types/entities';
import { formatLKR, formatDate } from '../../lib/format';
export function BikeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'loans'>(
    'overview'
  );
  const bikes: Bike[] = [];
  const loans: Loan[] = [];
  const bike = bikes.find((b) => b.id === id);
  if (!bike) {
    return (
      <div className="max-w-7xl mx-auto">
        <EmptyState
          icon={BikeIcon}
          title="Bike not found"
          description="The bike you are looking for does not exist or has been removed." />
        
      </div>);

  }
  const linkedLoans = loans.filter((l) => l.bikeId === bike.id);
  const profit = bike.sellingPrice - bike.costPrice;
  const tabs = [
  {
    id: 'overview',
    label: 'Overview'
  },
  {
    id: 'history',
    label: 'History'
  },
  {
    id: 'loans',
    label: 'Linked Loans'
  }];

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <PageHeader
        title={bike.model}
        subtitle={
        <div className="flex items-center gap-3 mt-1">
            <span className="font-mono text-xs text-neutral-500">
              {bike.id}
            </span>
            <StatusChip status={bike.status} />
          </div>
        }
        actions={
        <>
            {bike.status === 'in_stock' &&
          <button className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50">
                <CheckIcon className="-ml-0.5 h-4 w-4 text-success-600" />
                Mark as sold
              </button>
          }
            <button
            onClick={() => navigate(`/bikes/${bike.id}/edit`)}
            className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50">
            
              <EditIcon className="-ml-0.5 h-4 w-4 text-neutral-400" />
              Edit
            </button>
            <button className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-danger-600 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50">
              <Trash2Icon className="-ml-0.5 h-4 w-4" />
            </button>
          </>
        } />
      

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <KpiCard label="Selling Price" value={formatLKR(bike.sellingPrice)} />
        <KpiCard label="Cost Price" value={formatLKR(bike.costPrice)} />
        <KpiCard
          label="Profit Margin"
          value={formatLKR(profit)}
          delta={{
            value: `${Math.round(profit / bike.costPrice * 100)}%`,
            trend: profit > 0 ? 'up' : 'neutral'
          }} />
        
        <KpiCard
          label={bike.status === 'sold' ? 'Sold Date' : 'Added Date'}
          value={
          bike.status === 'sold' && bike.soldDate ?
          formatDate(bike.soldDate) :
          formatDate(bike.purchaseDate)
          } />
        
      </div>

      <div className="border-b border-neutral-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) =>
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                ${activeTab === tab.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'}
              `}>
            
              {tab.label}
            </button>
          )}
        </nav>
      </div>

      {activeTab === 'overview' &&
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="aspect-square bg-neutral-100 rounded-xl flex items-center justify-center border border-neutral-200">
              <BikeIcon className="h-24 w-24 text-neutral-300" />
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-base font-semibold leading-6 text-neutral-900 mb-4">
                  Bike Details
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">
                      Chassis Number
                    </dt>
                    <dd className="mt-1 text-sm text-neutral-900 font-mono">
                      {bike.chassisNo}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">
                      Engine Number
                    </dt>
                    <dd className="mt-1 text-sm text-neutral-900 font-mono">
                      {bike.engineNo}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">
                      Year
                    </dt>
                    <dd className="mt-1 text-sm text-neutral-900">
                      {bike.year}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">
                      Color
                    </dt>
                    <dd className="mt-1 text-sm text-neutral-900">
                      {bike.color}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      }

      {activeTab === 'history' &&
      <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-6">
          <div className="flow-root">
            <ul role="list" className="-mb-8">
              <li>
                <div className="relative pb-8">
                  <span
                  className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-neutral-200"
                  aria-hidden="true" />
                
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="h-8 w-8 rounded-full bg-brand-50 flex items-center justify-center ring-8 ring-white">
                        <BikeIcon
                        className="h-4 w-4 text-brand-600"
                        aria-hidden="true" />
                      
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                      <div>
                        <p className="text-sm text-neutral-500">
                          Added to stock
                        </p>
                      </div>
                      <div className="whitespace-nowrap text-right text-sm text-neutral-500">
                        {formatDate(bike.purchaseDate)}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
              {bike.status === 'sold' && bike.soldDate &&
            <li>
                  <div className="relative pb-8">
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-success-50 flex items-center justify-center ring-8 ring-white">
                          <CheckIcon
                        className="h-4 w-4 text-success-600"
                        aria-hidden="true" />
                      
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        <div>
                          <p className="text-sm text-neutral-500">
                            Marked as sold
                          </p>
                        </div>
                        <div className="whitespace-nowrap text-right text-sm text-neutral-500">
                          {formatDate(bike.soldDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
            }
            </ul>
          </div>
        </div>
      }

      {activeTab === 'loans' &&
      <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden">
          {linkedLoans.length > 0 ?
        <ul role="list" className="divide-y divide-neutral-200">
              {linkedLoans.map((loan) =>
          <li
            key={loan.id}
            className="px-4 py-4 sm:px-6 hover:bg-neutral-50 cursor-pointer"
            onClick={() => navigate(`/loans/${loan.id}`)}>
            
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-brand-600 truncate font-mono">
                        {loan.id}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {formatDate(loan.startDate)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <StatusChip status={loan.status} />
                      <p className="mt-1 text-sm font-medium text-neutral-900 tabular-nums">
                        {formatLKR(loan.amount)}
                      </p>
                    </div>
                  </div>
                </li>
          )}
            </ul> :

        <div className="p-6 text-center text-sm text-neutral-500">
              No loans linked to this bike.
            </div>
        }
        </div>
      }
    </div>);

}