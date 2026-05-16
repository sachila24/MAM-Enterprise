import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { KpiCard } from '../../components/ui/KpiCard';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import { StatusChip } from '../../components/ui/StatusChip';
import { formatLKR, formatDate, formatEnum } from '../../lib/format';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import {
  listCustomers,
  listLoans,
  listLoanPayments,
} from '../../lib/local-db/repositories';

export function PaymentsList() {
  const navigate = useNavigate();
  const db = useDemoDb();
  const [search, setSearch] = useState('');
  const loanPayments = listLoanPayments(db);
  const loans = listLoans(db);
  const customers = listCustomers(db);
  const today = new Date().toISOString().split('T')[0];
  const monthPrefix = today.slice(0, 7);

  const loanCodeById = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of loans) m.set(l.id, l.loanCode);
    return m;
  }, [loans]);

  const enrichedPayments = useMemo(
    () =>
      loanPayments.map((p) => {
        const loan = loans.find((l) => l.id === p.loanId);
        const customer = loan
          ? customers.find((c) => c.id === loan.customerId)
          : undefined;
        return { ...p, loan, customer };
      }),
    [loanPayments, loans, customers]
  );

  const filteredPayments = enrichedPayments.filter((p) => {
    const code = loanCodeById.get(p.loanId) ?? '';
    const q = search.toLowerCase();
    return (
      p.receiptNumber.toLowerCase().includes(q) ||
      p.customer?.name.toLowerCase().includes(q) ||
      code.toLowerCase().includes(q)
    );
  });

  const collectedToday = loanPayments
    .filter((p) => p.status === 'CONFIRMED' && p.paymentDate === today)
    .reduce((sum, p) => sum + p.amount, 0);

  const collectedThisMonth = loanPayments
    .filter(
      (p) => p.status === 'CONFIRMED' && p.paymentDate.startsWith(monthPrefix)
    )
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingConfirmations = loanPayments.filter(
    (p) => p.status !== 'CONFIRMED'
  ).length;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Payments"
        actions={
          <button
            onClick={() => navigate('/payments/new')}
            className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Record Payment
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <KpiCard label="Collected Today" value={formatLKR(collectedToday)} />
        <KpiCard
          label="Collected This Month (cash)"
          value={formatLKR(collectedThisMonth)}
        />
        <KpiCard
          label="Pending Confirmations"
          value={pendingConfirmations}
          delta={
            pendingConfirmations > 0
              ? {
                  value: 'Needs review',
                  trend: 'neutral',
                }
              : undefined
          }
        />
      </div>

      <FilterToolbar
        onSearchChange={setSearch}
        searchPlaceholder="Search by receipt, customer, or loan code..."
      />

      <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">
                  Receipt
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                  Cash received
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                  Discount
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                  Total applied
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  Method
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  Date
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900 sm:pr-6">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {filteredPayments.map((p) => {
                const disc = p.discountAmount ?? 0;
                const applied = p.appliedAmount ?? p.amount + disc;
                return (
                  <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-600 tabular-nums sm:pl-6">
                      {p.receiptNumber}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-neutral-900 tabular-nums font-medium">
                      {formatLKR(p.amount)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-right tabular-nums text-neutral-700">
                      {formatLKR(disc)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-right tabular-nums font-semibold text-neutral-900">
                      {formatLKR(applied)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                      {formatEnum(p.paymentMethod)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500 tabular-nums">
                      {formatDate(p.paymentDate)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm sm:pr-6">
                      <StatusChip status={p.status.toLowerCase()} />
                    </td>
                  </tr>
                );
              })}
              {filteredPayments.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-sm text-neutral-500"
                  >
                    No payments found matching your criteria.
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
