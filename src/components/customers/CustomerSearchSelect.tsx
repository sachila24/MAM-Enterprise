import React, { useMemo, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import type { Customer } from '../../types/entities';
import { useT } from '../../i18n/I18nProvider';

function matchesCustomerQuery(customer: Customer, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    customer.name.toLowerCase().includes(q) ||
    customer.nic.toLowerCase().includes(q) ||
    customer.phone.toLowerCase().includes(q) ||
    (customer.customerCode ?? '').toLowerCase().includes(q)
  );
}

export interface CustomerSearchSelectProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelect: (customerId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CustomerSearchSelect({
  customers,
  selectedCustomerId,
  onSelect,
  placeholder,
  disabled = false,
}: CustomerSearchSelectProps) {
  const { t } = useT();
  const [search, setSearch] = useState('');

  const selected = selectedCustomerId
    ? customers.find((c) => c.id === selectedCustomerId)
    : null;

  const filtered = useMemo(
    () => customers.filter((c) => matchesCustomerQuery(c, search)),
    [customers, search]
  );

  const searchPlaceholder = placeholder ?? t('searchCustomerPlaceholder');

  if (disabled) {
    return (
      <p className="text-sm text-neutral-500">{t('customerSelectionDisabled')}</p>
    );
  }

  if (selected) {
    return (
      <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
          {t('selectedCustomerLabel')}
        </p>
        <p className="mt-1 text-lg font-semibold text-neutral-900">{selected.name}</p>
        <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div>
            <dt className="text-neutral-500">{t('colNic')}</dt>
            <dd className="font-medium text-neutral-900 tabular-nums">{selected.nic}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">{t('field.phone')}</dt>
            <dd className="font-medium text-neutral-900">{selected.phone}</dd>
          </div>
          {selected.customerCode && (
            <div>
              <dt className="text-neutral-500">{t('customerCode')}</dt>
              <dd className="font-medium text-brand-700 tabular-nums">
                {selected.customerCode}
              </dd>
            </div>
          )}
        </dl>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setSearch('');
          }}
          className="mt-4 text-sm font-semibold text-brand-700 hover:text-brand-600"
        >
          {t('changeCustomer')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="block w-full rounded-md border-0 py-2 pl-10 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm"
        />
      </div>
      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 overflow-hidden max-h-72 overflow-y-auto">
        {filtered.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className="w-full text-left px-4 py-3 hover:bg-brand-50 transition-colors"
            >
              <p className="font-medium text-neutral-900">{c.name}</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {c.nic} · {c.phone}
                {c.customerCode ? ` · ${c.customerCode}` : ''}
              </p>
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-neutral-500">
            {t('noCustomersMatchSearch')}
          </li>
        )}
      </ul>
    </div>
  );
}
