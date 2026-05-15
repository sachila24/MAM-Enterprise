import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import type { ActivityLog as ActivityLogEntry, Staff } from '../../types/entities';
import { formatDateTime, truncateId } from '../../lib/format';
export function ActivityLog() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [userFilter, setUserFilter] = useState('All');
  const activityLog: ActivityLogEntry[] = [];
  const staff: Staff[] = [];
  const filteredLog = activityLog.filter((log) => {
    const matchesSearch =
    log.summary.toLowerCase().includes(search.toLowerCase()) ||
    log.referenceId.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'All' || log.type === typeFilter;
    const matchesUser = userFilter === 'All' || log.userId === userFilter;
    return matchesSearch && matchesType && matchesUser;
  });
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'loan':
        return 'bg-brand-50 text-brand-700 ring-brand-500/20';
      case 'payment':
        return 'bg-success-50 text-success-700 ring-success-500/20';
      case 'bike':
        return 'bg-warning-50 text-warning-700 ring-warning-500/20';
      case 'customer':
        return 'bg-info-50 text-info-700 ring-info-500/20';
      case 'guarantee':
        return 'bg-purple-50 text-purple-700 ring-purple-500/20';
      default:
        return 'bg-neutral-50 text-neutral-600 ring-neutral-500/10';
    }
  };
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Activity Log"
        subtitle="Important actions are recorded for accountability" />
      

      <FilterToolbar
        searchPlaceholder="Search summary or reference..."
        onSearchChange={setSearch}
        filters={
        <>
            <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="block w-32 rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6">
            
              <option value="All">All Types</option>
              <option value="loan">Loan</option>
              <option value="payment">Payment</option>
              <option value="bike">Bike</option>
              <option value="customer">Customer</option>
              <option value="guarantee">Guarantee</option>
              <option value="system">System</option>
            </select>
            <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="block w-40 rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6">
            
              <option value="All">All Users</option>
              {staff.map((user) =>
            <option key={user.id} value={user.id}>
                  {user.name}
                </option>
            )}
            </select>
          </>
        } />
      

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-neutral-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">
                  When
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  User
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  Action
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  Type
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  Summary
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                  Reference
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {filteredLog.map((log) => {
                const user = staff.find((u) => u.id === log.userId);
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-neutral-50 transition-colors">
                    
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-neutral-500 sm:pl-6">
                      {formatDateTime(log.when)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900 font-medium">
                      {user?.name || 'Unknown'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900">
                      {log.action}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize ${getTypeColor(log.type)}`}>
                        
                        {log.type}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-neutral-500 max-w-xs truncate">
                      {log.summary}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                      <span
                        className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-xs cursor-pointer hover:bg-neutral-200"
                        title={log.referenceId}
                        onClick={() =>
                        navigator.clipboard.writeText(log.referenceId)
                        }>
                        
                        {truncateId(log.referenceId)}
                      </span>
                    </td>
                  </tr>);

              })}
              {filteredLog.length === 0 &&
              <tr>
                  <td
                  colSpan={6}
                  className="py-10 text-center text-sm text-neutral-500">
                  
                    {activityLog.length === 0
                      ? 'No activity recorded yet.'
                      : 'No activity found matching your criteria.'}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>);

}