import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { KpiCard } from '../../components/ui/KpiCard';
import { StatusChip } from '../../components/ui/StatusChip';
import { EmptyState } from '../../components/ui/EmptyState';
import type { Bike, Customer, Loan, Payment } from '../../types/entities';
import { buildInstallmentSchedule } from '../../lib/installment-schedule';
import { formatLKR, formatDate, formatEnum } from '../../lib/format';
import { FileTextIcon, AlertCircleIcon } from 'lucide-react';
export function LoanDetail() {
  const { id } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    'schedule' | 'payments' | 'guarantees'>(
    'schedule');
  const loans: Loan[] = [];
  const customers: Customer[] = [];
  const payments: Payment[] = [];
  const bikes: Bike[] = [];
  const loan = id ? loans.find((l) => l.id === id) : undefined;
  const customer = loan
    ? customers.find((c) => c.id === loan.customerId)
    : undefined;
  const loanPayments = loan
    ? payments.filter((p) => p.loanId === loan.id)
    : [];
  const schedule = buildInstallmentSchedule(loan);
  const bike = loan?.bikeId
    ? bikes.find((b) => b.id === loan.bikeId)
    : undefined;
  if (!loan || !customer) {
    return (
      <EmptyState
        icon={AlertCircleIcon}
        title="Loan not found"
        description="The loan you are looking for does not exist or has been removed." />);


  }
  const totalPaid = loanPayments
    .filter((p) => p.status === 'confirmed')
    .reduce((sum, p) => sum + p.amount, 0);
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold leading-6 text-neutral-900">
              {loan.loanCode}
            </h1>
            <StatusChip status={loan.status} />
          </div>
          <p className="mt-2 text-sm text-neutral-500">
            {customer.name} • {formatEnum(loan.loanPurpose)}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/payments/new?loanId=${loan.id}`)}
            className="inline-flex items-center justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
            
            Record Payment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <KpiCard
          label="Principal Amount"
          value={formatLKR(loan.principalAmount)} />
        
        <KpiCard label="Current Balance" value={formatLKR(loan.balanceAmount)} />
        <KpiCard label="Total Paid" value={formatLKR(totalPaid)} />
        <KpiCard
          label="Next Installment"
          value={formatDate(loan.dueDate ?? loan.firstDueDate)} />
        
      </div>

      <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-lg overflow-hidden">
        <div className="border-b border-neutral-200">
          <nav className="-mb-px flex" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`w-1/3 border-b-2 py-4 px-1 text-center text-sm font-medium ${activeTab === 'schedule' ? 'border-brand-500 text-brand-600' : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'}`}>
              
              Schedule
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`w-1/3 border-b-2 py-4 px-1 text-center text-sm font-medium ${activeTab === 'payments' ? 'border-brand-500 text-brand-600' : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'}`}>
              
              Payments
            </button>
            <button
              onClick={() => setActiveTab('guarantees')}
              className={`w-1/3 border-b-2 py-4 px-1 text-center text-sm font-medium ${activeTab === 'guarantees' ? 'border-brand-500 text-brand-600' : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'}`}>
              
              Guarantees
            </button>
          </nav>
        </div>

        <div className="p-0">
          {activeTab === 'schedule' &&
          <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">
                    No.
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                    Due Date
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                    Amount
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {schedule.map((inst) =>
              <tr key={inst.installmentNo}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-neutral-900 sm:pl-6 tabular-nums">
                      {inst.installmentNo}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500 tabular-nums">
                      {formatDate(inst.dueDate)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900 text-right tabular-nums">
                      {formatLKR(inst.amount)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <StatusChip status={inst.status} />
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          }

          {activeTab === 'payments' &&
          <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">
                    Date
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                    Receipt No
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                    Method
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                    Amount
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {loanPayments.map((p) =>
              <tr key={p.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-neutral-500 sm:pl-6 tabular-nums">
                      {formatDate(p.paidAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-brand-600 tabular-nums">
                      {p.receiptNo}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                      {formatEnum(p.method)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900 text-right tabular-nums">
                      {formatLKR(p.amount)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <StatusChip status={p.status} />
                    </td>
                  </tr>
              )}
                {loanPayments.length === 0 &&
              <tr>
                    <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-sm text-neutral-500">
                  
                      No payments recorded yet.
                    </td>
                  </tr>
              }
              </tbody>
            </table>
          }

          {activeTab === 'guarantees' &&
          <div className="p-6">
              {loan.loanPurpose === 'BIKE_INSTALLMENT' && bike ?
            <div className="rounded-md bg-neutral-50 p-4 ring-1 ring-neutral-200 max-w-md">
                  <h4 className="text-sm font-medium text-neutral-900 mb-4">
                    Linked Bike
                  </h4>
                  <dl className="divide-y divide-neutral-200">
                    <div className="py-2 flex justify-between">
                      <dt className="text-sm font-medium text-neutral-500">
                        Model
                      </dt>
                      <dd className="text-sm text-neutral-900">{bike.model}</dd>
                    </div>
                    <div className="py-2 flex justify-between">
                      <dt className="text-sm font-medium text-neutral-500">
                        Engine No
                      </dt>
                      <dd className="text-sm text-neutral-900 tabular-nums">
                        {bike.engineNo}
                      </dd>
                    </div>
                    <div className="py-2 flex justify-between">
                      <dt className="text-sm font-medium text-neutral-500">
                        Chassis No
                      </dt>
                      <dd className="text-sm text-neutral-900 tabular-nums">
                        {bike.chassisNo}
                      </dd>
                    </div>
                  </dl>
                </div> :

            <EmptyState
              icon={FileTextIcon}
              title="No guarantees"
              description="Add guarantee items for this loan from the guarantees screen." />

            }
            </div>
          }
        </div>
      </div>
    </div>);

}