import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { KpiCard } from '../../components/ui/KpiCard';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import { StatusChip } from '../../components/ui/StatusChip';
import type { Customer, Loan } from '../../types/entities';
import { formatLKR, formatDate } from '../../lib/format';
import { useT } from '../../i18n/I18nProvider';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import { listCustomers, listLoans } from '../../lib/local-db/repositories';
import {
  getLastPaymentDate,
  getLedgerLoanStatus,
} from '../../lib/display/ledgerDisplay';

export function LoansList() {
  const { t, language } = useT();
  const navigate = useNavigate();
  const db = useDemoDb();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const loans = listLoans(db);
  const customers = listCustomers(db);

  const lastPaymentByLoan = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const loan of loans) {
      const payments = db.loan_payments.filter((p) => p.loan_id === loan.id);
      map.set(loan.id, getLastPaymentDate(payments));
    }
    return map;
  }, [db, loans]);

  const enrichedLoans = loans.map((loan) => ({
    ...loan,
    customer: customers.find((c) => c.id === loan.customerId),
    ledgerStatus: getLedgerLoanStatus(loan.status, loan.balanceAmount),
    lastPaymentDate: lastPaymentByLoan.get(loan.id) ?? null,
  }));

  const filteredLoans = enrichedLoans.filter((loan) => {
    const matchesSearch =
      loan.loanCode.toLowerCase().includes(search.toLowerCase()) ||
      loan.customer?.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      loan.ledgerStatus.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeLoans = enrichedLoans.filter((l) => l.ledgerStatus === 'ACTIVE').length;
  const outstandingPortfolio = loans.reduce((sum, l) => sum + l.balanceAmount, 0);
  const overdueLoans = enrichedLoans.filter((l) => l.ledgerStatus === 'OVERDUE').length;
  const completedCount = enrichedLoans.filter((l) => l.ledgerStatus === 'COMPLETED').length;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title={t('nav.loans')}
        subtitle={t('loansSubtitle')}
        actions={
          <button
            onClick={() => navigate('/loans/new')}
            className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            {t('newLoan')}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <KpiCard label={t('totalActiveLoans')} value={activeLoans} />
        <KpiCard
          label={t('outstandingPortfolio')}
          value={formatLKR(outstandingPortfolio)}
        />
        <KpiCard
          label={t('overdueLoans')}
          value={overdueLoans}
          delta={
            overdueLoans > 0
              ? { value: t('needsAttention'), trend: 'down' }
              : undefined
          }
        />
        <KpiCard label={t('completedLoansCount')} value={completedCount} />
      </div>

      <FilterToolbar
        onSearchChange={setSearch}
        searchPlaceholder={t('searchLoans')}
        filters={
          <>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block rounded-md border-0 py-1.5 pl-3 pr-8 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 bg-white"
            >
              <option value="all">{t('allStatuses')}</option>
              <option value="active">{t('statusActive')}</option>
              <option value="overdue">{t('statusOverdue')}</option>
              <option value="completed">{t('statusCompleted')}</option>
            </select>
          </>
        }
      />

      <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6"
                >
                  {t('field.customer')}
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900"
                >
                  {t('loanId')}
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900"
                >
                  {t('field.amount')}
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900"
                >
                  {t('paid')}
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900"
                >
                  {t('field.balance')}
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900"
                >
                  {t('lastPaymentDate')}
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900"
                >
                  {t('field.status')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {filteredLoans.map((loan) => (
                <tr
                  key={loan.id}
                  onClick={() => navigate(`/loans/${loan.id}`)}
                  className="cursor-pointer hover:bg-neutral-50 transition-colors"
                >
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-neutral-900 sm:pl-6">
                    {loan.customer?.name || t('misc.unknown')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-600 tabular-nums">
                    {loan.loanCode}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900 text-right tabular-nums">
                    {formatLKR(loan.principalAmount)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-700 text-right tabular-nums">
                    {formatLKR(loan.paidAmount)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900 text-right tabular-nums font-medium">
                    {formatLKR(
                      loan.ledgerStatus === 'COMPLETED' ? 0 : loan.balanceAmount
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500 tabular-nums">
                    {loan.lastPaymentDate
                      ? formatDate(loan.lastPaymentDate, 'short', language)
                      : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <StatusChip status={loan.ledgerStatus} />
                  </td>
                </tr>
              ))}
              {filteredLoans.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-sm text-neutral-500"
                  >
                    {t('noLoansFound')}
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
