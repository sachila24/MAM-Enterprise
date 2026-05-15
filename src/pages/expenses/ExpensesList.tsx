import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { KpiCard } from '../../components/ui/KpiCard';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import type { Expense } from '../../types/entities';
import { formatLKR, formatDate, formatEnum } from '../../lib/format';
export function ExpensesList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const expenses: Expense[] = [];
  const totalThisMonth = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const countThisMonth = expenses.length;
  // Find top category
  const categoryTotals = expenses.reduce(
    (acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    },
    {} as Record<string, number>
  );
  const topCategory =
  Object.keys(categoryTotals).length > 0 ?
  Object.keys(categoryTotals).reduce((a, b) =>
  categoryTotals[a] > categoryTotals[b] ? a : b
  ) :
  'None';
  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch = exp.notes.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
    categoryFilter === 'All' || exp.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Expenses"
        subtitle="Operating costs and business spending"
        actions={
        <button
          onClick={() => navigate('/expenses/new')}
          className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
          
            <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Add expense
          </button>
        } />
      

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <KpiCard label="Total This Month" value={formatLKR(totalThisMonth)} />
        <KpiCard label="Top Category" value={formatEnum(topCategory)} />
        <KpiCard label="Expense Count" value={countThisMonth} />
      </div>

      <FilterToolbar
        searchPlaceholder="Search notes..."
        onSearchChange={setSearch}
        filters={
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="block w-40 rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6">
          
            <option value="All">All Categories</option>
            <option value="RENT">Rent</option>
            <option value="UTILITIES">Utilities</option>
            <option value="SALARIES">Salaries</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="FUEL">Fuel</option>
            <option value="SUPPLIES">Supplies</option>
            <option value="MARKETING">Marketing</option>
            <option value="OTHER">Other</option>
          </select>
        } />
      

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-neutral-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">
                  Date
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  Category
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  Notes
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {filteredExpenses.map((exp) =>
              <tr
                key={exp.id}
                className="hover:bg-neutral-50 transition-colors">
                
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-neutral-500 sm:pl-6">
                    {formatDate(exp.date)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600 ring-1 ring-inset ring-neutral-500/10">
                      {formatEnum(exp.category)}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-sm text-neutral-900 max-w-md truncate">
                    {exp.notes || '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900 text-right tabular-nums font-medium">
                    {formatLKR(exp.amount)}
                  </td>
                </tr>
              )}
              {filteredExpenses.length === 0 &&
              <tr>
                  <td
                  colSpan={4}
                  className="py-10 text-center text-sm text-neutral-500">
                  
                    No expenses found matching your criteria.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>);

}