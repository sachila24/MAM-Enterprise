import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  EditIcon,
  PhoneIcon,
  MapPinIcon,
  BanknoteIcon } from
'lucide-react';
import { StatusChip } from '../../components/ui/StatusChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatLKR, formatDate, formatEnum } from '../../lib/format';
import type { Customer, Loan, Payment, Guarantee } from '../../types/entities';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import {
  getCustomer,
  listGuarantees,
  listLoans,
  listPayments,
} from '../../lib/local-db/repositories';
import { useT } from '../../i18n/I18nProvider';

type Tab = 'overview' | 'loans' | 'payments' | 'guarantees';
export function CustomerDetail() {
  const { t } = useT();
  const { id } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const db = useDemoDb();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const customer = id ? getCustomer(id, db) : undefined;
  if (!customer) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/customers')}
          className="flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-700">
          
          <ArrowLeftIcon className="mr-1 h-4 w-4" /> {t('backToCustomers')}
        </button>
        <EmptyState
          title={t('customerNotFound')}
          description={t('customerNotFound')} />
        
      </div>);

  }
  const loans = id
    ? listLoans(db).filter((l) => l.customerId === id)
    : [];
  const payments = id
    ? listPayments(db).filter((p) => p.loanId && loans.some((l) => l.id === p.loanId))
    : [];
  const guarantees = id
    ? listGuarantees(db).filter((g) => g.loanId && loans.some((l) => l.id === g.loanId))
    : [];
  const tabs = [
  {
    id: 'overview',
    name: t('tabOverview')
  },
  {
    id: 'loans',
    name: `${t('nav.loans')} (${loans.length})`
  },
  {
    id: 'payments',
    name: `${t('payments')} (${payments.length})`
  },
  {
    id: 'guarantees',
    name: `${t('guarantees')} (${guarantees.length})`
  }];

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/customers')}
        className="flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-700">
        
        <ArrowLeftIcon className="mr-1 h-4 w-4" /> {t('backToCustomers')}
      </button>

      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-3">
            {customer.name}
            <StatusChip status={customer.status} />
          </h1>
          <p className="mt-1 text-sm text-neutral-500 tabular-nums">
            {customer.id} · NIC: {customer.nic}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button
            type="button"
            onClick={() => navigate(`/customers/${customer.id}/edit`)}
            className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50">
            <EditIcon className="-ml-0.5 h-4 w-4 text-neutral-400" />
            {t('action.edit')}
          </button>
          <Link
            to={`/loans/new?customerId=${customer.id}`}
            className="inline-flex items-center gap-x-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
            
            <BanknoteIcon className="-ml-0.5 h-4 w-4" />
            {t('newLoan')}
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) =>
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                ${activeTab === tab.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'}
              `}>
            
              {tab.name}
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' &&
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-6">
                <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4">
                  Contact Info
                </h3>
                <dl className="space-y-4">
                  <div className="flex items-start gap-3">
                    <PhoneIcon className="h-5 w-5 text-neutral-400 shrink-0 mt-0.5" />
                    <div>
                      <dt className="sr-only">Phone</dt>
                      <dd className="text-sm font-medium text-neutral-900 tabular-nums">
                        {customer.phone}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPinIcon className="h-5 w-5 text-neutral-400 shrink-0 mt-0.5" />
                    <div>
                      <dt className="sr-only">Address</dt>
                      <dd className="text-sm text-neutral-900">
                        {customer.address}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>

              <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-6">
                <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4">
                  Account Summary
                </h3>
                <dl className="space-y-4">
                  <div className="flex justify-between">
                    <dt className="text-sm text-neutral-500">
                      Total Outstanding
                    </dt>
                    <dd className="text-sm font-semibold text-neutral-900 tabular-nums">
                      {formatLKR(customer.outstandingBalance)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-neutral-500">Active Loans</dt>
                    <dd className="text-sm font-medium text-neutral-900 tabular-nums">
                      {customer.activeLoans}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-neutral-500">Customer Since</dt>
                    <dd className="text-sm font-medium text-neutral-900 tabular-nums">
                      {formatDate(customer.createdAt)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden">
                <div className="border-b border-neutral-200 px-4 py-5 sm:px-6">
                  <h3 className="text-base font-semibold leading-6 text-neutral-900">
                    Active Loans
                  </h3>
                </div>
                {loans.filter((l) => !['COMPLETED', 'SETTLED'].includes(l.status)).length > 0 ?
              <ul role="list" className="divide-y divide-neutral-200">
                    {loans.
                filter((l) => !['COMPLETED', 'SETTLED'].includes(l.status)).
                map((loan) =>
                <li
                  key={loan.id}
                  className="px-4 py-4 sm:px-6 hover:bg-neutral-50 cursor-pointer"
                  onClick={() => navigate(`/loans/${loan.id}`)}>
                  
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-brand-600 tabular-nums">
                                {loan.loanCode}
                              </p>
                              <p className="text-sm text-neutral-500 mt-1">
                                {formatEnum(loan.loanPurpose)} · {loan.termMonths ?? '—'} months
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                                {formatLKR(loan.balanceAmount)}
                              </p>
                              <div className="mt-1">
                                <StatusChip status={loan.status} />
                              </div>
                            </div>
                          </div>
                        </li>
                )}
                  </ul> :

              <div className="px-4 py-8 text-center text-sm text-neutral-500">
                    No active loans.
                  </div>
              }
              </div>
            </div>
          </div>
        }

        {activeTab === 'loans' &&
        <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden">
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
                  
                    Type
                  </th>
                  <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  
                    Start Date
                  </th>
                  <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  
                    Status
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
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {loans.map((loan) =>
              <tr
                key={loan.id}
                onClick={() => navigate(`/loans/${loan.id}`)}
                className="hover:bg-neutral-50 cursor-pointer">
                
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-600 sm:pl-6 tabular-nums">
                      {loan.loanCode}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                      {formatEnum(loan.loanPurpose)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500 tabular-nums">
                      {formatDate(loan.startDate)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <StatusChip status={loan.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900 text-right tabular-nums">
                      {formatLKR(loan.principalAmount)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-neutral-900 text-right tabular-nums">
                      {formatLKR(loan.balanceAmount)}
                    </td>
                  </tr>
              )}
                {loans.length === 0 &&
              <tr>
                    <td
                  colSpan={6}
                  className="py-10 text-center text-sm text-neutral-500">
                  
                      No loans found.
                    </td>
                  </tr>
              }
              </tbody>
            </table>
          </div>
        }

        {activeTab === 'payments' &&
        <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th
                  scope="col"
                  className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">
                  
                    Receipt No
                  </th>
                  <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  
                    Date
                  </th>
                  <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  
                    Loan ID
                  </th>
                  <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  
                    Method
                  </th>
                  <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  
                    Status
                  </th>
                  <th
                  scope="col"
                  className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                  
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {payments.map((payment) =>
              <tr key={payment.id} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-neutral-900 sm:pl-6 tabular-nums">
                      {payment.receiptNo}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500 tabular-nums">
                      {formatDate(payment.paidAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-600 tabular-nums">
                      <Link to={`/loans/${payment.loanId}`}>
                        {payment.loanId}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                      {payment.method.replace('_', ' ')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <StatusChip status={payment.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-neutral-900 text-right tabular-nums">
                      {formatLKR(payment.amount)}
                    </td>
                  </tr>
              )}
                {payments.length === 0 &&
              <tr>
                    <td
                  colSpan={6}
                  className="py-10 text-center text-sm text-neutral-500">
                  
                      No payments found.
                    </td>
                  </tr>
              }
              </tbody>
            </table>
          </div>
        }

        {activeTab === 'guarantees' &&
        <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th
                  scope="col"
                  className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">
                  
                    Type
                  </th>
                  <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  
                    Description
                  </th>
                  <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  
                    Loan ID
                  </th>
                  <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  
                    Location
                  </th>
                  <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {guarantees.map((guarantee) =>
              <tr key={guarantee.id} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-neutral-900 sm:pl-6">
                      {guarantee.type.replace('_', ' ')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                      {guarantee.description}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-600 tabular-nums">
                      <Link to={`/loans/${guarantee.loanId}`}>
                        {guarantee.loanId}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                      {guarantee.storageLocation}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <StatusChip status={guarantee.status} />
                    </td>
                  </tr>
              )}
                {guarantees.length === 0 &&
              <tr>
                    <td
                  colSpan={5}
                  className="py-10 text-center text-sm text-neutral-500">
                  
                      No guarantees found.
                    </td>
                  </tr>
              }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>);

}