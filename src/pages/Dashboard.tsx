import React from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  BanknoteIcon,
  CreditCardIcon,
  ReceiptTextIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  WalletIcon,
  PieChartIcon,
  BikeIcon,
  PhoneIcon } from
'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { KpiCard } from '../components/ui/KpiCard';
import { formatLKR, formatDateTime, formatDate } from '../lib/format';
import { EMPTY_DASHBOARD_KPIS } from '../types/entities';
import type { ActivityLog, Loan, Customer } from '../types/entities';

export function Dashboard() {
  const kpis = EMPTY_DASHBOARD_KPIS;
  const overdueLoans: (Loan & { customer?: Customer })[] = [];
  const recentActivity: ActivityLog[] = [];
  const today = new Date();
  const greeting = `Good morning, Sachila`;
  const dateStr = formatDate(today, 'long');
  const quickActions =
  <div className="flex gap-2">
      <Link
      to="/customers/new"
      className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50">
      
        <PlusIcon
        className="-ml-0.5 h-4 w-4 text-neutral-400"
        aria-hidden="true" />
      
        Customer
      </Link>
      <Link
      to="/loans/new"
      className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50">
      
        <BanknoteIcon
        className="-ml-0.5 h-4 w-4 text-neutral-400"
        aria-hidden="true" />
      
        Loan
      </Link>
      <Link
      to="/payments/new"
      className="inline-flex items-center gap-x-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
      
        <CreditCardIcon className="-ml-0.5 h-4 w-4" aria-hidden="true" />
        Payment
      </Link>
    </div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Dashboard" subtitle={`${greeting} · ${dateStr}`} />
        <div className="mt-4 sm:mt-0 pb-6">{quickActions}</div>
      </div>

      {/* Today Strip */}
      <div>
        <h2 className="text-base font-semibold leading-6 text-neutral-900 mb-4">
          Today
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Collections / Target"
            value={`${formatLKR(kpis.todayCollections, {
              withSymbol: false
            })} / ${formatLKR(kpis.todayTarget, {
              withSymbol: false
            })}`}
            icon={TrendingUpIcon}
            delta={
              kpis.todayTarget > 0
                ? {
                    value: `${Math.round((kpis.todayCollections / kpis.todayTarget) * 100)}%`,
                    trend:
                      kpis.todayCollections >= kpis.todayTarget ? 'up' : 'neutral',
                  }
                : undefined
            }
          />
          
          <KpiCard
            label="Payments Received"
            value={kpis.todayPaymentsCount}
            icon={CreditCardIcon} />
          
          <KpiCard
            label="Overdue Follow-ups"
            value={kpis.overdueCount}
            icon={AlertCircleIcon}
            delta={
            kpis.overdueCount > 0 ?
            {
              value: 'Needs attention',
              trend: 'down'
            } :
            undefined
            } />
          
        </div>
      </div>

      {/* Money Snapshot */}
      <div>
        <h2 className="text-base font-semibold leading-6 text-neutral-900 mb-4">
          Money Snapshot
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Cash on Hand"
            value={formatLKR(kpis.cashOnHand)}
            icon={WalletIcon} />
          
          <KpiCard
            label="Outstanding Portfolio"
            value={formatLKR(kpis.outstandingPortfolio)}
            icon={PieChartIcon} />
          
          <KpiCard
            label="This Month Net"
            value={formatLKR(kpis.monthNet)}
            icon={BanknoteIcon}
            delta={{
              value: 'vs last month',
              trend: 'up'
            }} />
          
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column (Overdue + Stock) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Overdue Queue */}
          <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden">
            <div className="border-b border-neutral-200 px-4 py-5 sm:px-6 flex justify-between items-center bg-danger-50/50">
              <h3 className="text-base font-semibold leading-6 text-danger-900 flex items-center gap-2">
                <AlertCircleIcon className="h-5 w-5 text-danger-600" />
                Overdue Queue
              </h3>
              <Link
                to="/loans"
                className="text-sm font-medium text-brand-600 hover:text-brand-500">
                
                View all
              </Link>
            </div>
            <ul role="list" className="divide-y divide-neutral-200">
              {overdueLoans.map((loan) =>
              <li
                key={loan.id}
                className="px-4 py-4 sm:px-6 hover:bg-neutral-50">
                
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {loan.customer?.name}
                      </p>
                      <p className="text-sm text-neutral-500 flex items-center gap-2 mt-1">
                        <span className="tabular-nums">{loan.loanCode}</span>
                        <span>·</span>
                        <span className="text-danger-600 font-medium">
                          {loan.daysOverdue} days overdue
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                          {formatLKR(loan.balanceAmount)}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">Balance</p>
                      </div>
                      <div className="flex gap-2">
                        <a
                        href={`tel:${loan.customer?.phone}`}
                        className="rounded-full bg-white p-2 text-neutral-400 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50"
                        title="Call customer">
                        
                          <PhoneIcon className="h-4 w-4" />
                        </a>
                        <Link
                        to={`/payments/new?loanId=${loan.id}`}
                        className="rounded-full bg-white p-2 text-brand-600 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-brand-50"
                        title="Record payment">
                        
                          <CreditCardIcon className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              )}
              {overdueLoans.length === 0 &&
              <li className="px-4 py-8 text-center text-sm text-neutral-500">
                  No overdue loans. Great job!
                </li>
              }
            </ul>
          </div>

          {/* Stock Status */}
          <div>
            <h2 className="text-base font-semibold leading-6 text-neutral-900 mb-4">
              Stock Status
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm ring-1 ring-neutral-200">
                <dt className="truncate text-sm font-medium text-neutral-500 uppercase tracking-wider">
                  In Stock
                </dt>
                <dd className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 tabular-nums">
                  {kpis.inStockCount}
                </dd>
              </div>
              <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm ring-1 ring-neutral-200">
                <dt className="truncate text-sm font-medium text-neutral-500 uppercase tracking-wider">
                  Sold This Month
                </dt>
                <dd className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 tabular-nums">
                  {kpis.soldThisMonth}
                </dd>
              </div>
              <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm ring-1 ring-neutral-200 flex items-center justify-center">
                <Link
                  to="/bikes/new"
                  className="text-sm font-medium text-brand-600 hover:text-brand-500 flex items-center gap-1">
                  
                  <PlusIcon className="h-4 w-4" /> Add Bike
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Recent Activity) */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden h-full">
            <div className="border-b border-neutral-200 px-4 py-5 sm:px-6 flex justify-between items-center">
              <h3 className="text-base font-semibold leading-6 text-neutral-900">
                Recent Activity
              </h3>
              <Link
                to="/activity"
                className="text-sm font-medium text-brand-600 hover:text-brand-500">
                
                View all
              </Link>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="flow-root">
                <ul role="list" className="-mb-8">
                  {recentActivity.length === 0 && (
                    <li className="py-4 text-center text-sm text-neutral-500">
                      No recent activity yet.
                    </li>
                  )}
                  {recentActivity.map((activity, activityIdx) =>
                  <li key={activity.id}>
                      <div className="relative pb-8">
                        {activityIdx !== recentActivity.length - 1 ?
                      <span
                        className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-neutral-200"
                        aria-hidden="true" /> :

                      null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center ring-8 ring-white">
                              {activity.type === 'payment' &&
                            <CreditCardIcon className="h-4 w-4 text-success-600" />
                            }
                              {activity.type === 'loan' &&
                            <BanknoteIcon className="h-4 w-4 text-brand-600" />
                            }
                              {activity.type === 'bike' &&
                            <BikeIcon className="h-4 w-4 text-info-600" />
                            }
                              {activity.type === 'customer' &&
                            <PlusIcon className="h-4 w-4 text-neutral-600" />
                            }
                              {activity.type === 'guarantee' &&
                            <ReceiptTextIcon className="h-4 w-4 text-warning-600" />
                            }
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                            <div>
                              <p className="text-sm text-neutral-900 font-medium">
                                {activity.action}
                              </p>
                              <p className="text-sm text-neutral-500">
                                {activity.summary}
                              </p>
                            </div>
                            <div className="whitespace-nowrap text-right text-xs text-neutral-500">
                              <time dateTime={activity.when}>
                                {formatDateTime(activity.when).split(',')[1]}
                              </time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);

}