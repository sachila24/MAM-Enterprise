import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDownIcon, UserPlusIcon, XIcon, SearchIcon } from 'lucide-react';
import type { Customer } from '../../types/entities';

function normalizeQuery(s: string): string {
  return s.trim().toLowerCase();
}

function phoneDigits(s: string): string {
  return s.replace(/\D/g, '');
}

function customerMatches(customer: Customer, q: string): boolean {
  if (!q) return true;
  const n = normalizeQuery(q);
  const name = normalizeQuery(customer.name);
  const nic = normalizeQuery(customer.nic);
  const code = normalizeQuery(customer.customerCode ?? '');
  const phone = phoneDigits(customer.phone);
  const qPhone = phoneDigits(q);
  return (
    name.includes(n) ||
    nic.includes(n) ||
    code.includes(n) ||
    (qPhone.length > 0 && phone.includes(qPhone))
  );
}

export interface CustomerSearchPickerProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelect: (customerId: string | null) => void;
  addCustomerTo?: string;
  /** Placeholder for the search field */
  searchPlaceholder?: string;
  disabled?: boolean;
}

export function CustomerSearchPicker({
  customers,
  selectedCustomerId,
  onSelect,
  addCustomerTo = '/customers/new',
  searchPlaceholder = 'Search customer by name, NIC, phone, or code',
  disabled,
}: CustomerSearchPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(
    () => (selectedCustomerId ? customers.find((c) => c.id === selectedCustomerId) : null),
    [customers, selectedCustomerId]
  );

  const filtered = useMemo(() => {
    return customers.filter((c) => customerMatches(c, query));
  }, [customers, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const choose = useCallback(
    (id: string) => {
      onSelect(id);
      setOpen(false);
      setQuery('');
    },
    [onSelect]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(0, filtered.length - 1)));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    }
    if (e.key === 'Enter' && filtered[highlight]) {
      e.preventDefault();
      choose(filtered[highlight].id);
    }
  };

  return (
    <div ref={rootRef} className="space-y-3">
      {!selected ? (
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls="customer-picker-listbox"
            aria-autocomplete="list"
            disabled={disabled}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={searchPlaceholder}
            autoComplete="off"
            className="block w-full rounded-md border-0 py-2 pl-10 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm disabled:bg-neutral-50 disabled:opacity-60"
          />
          <ChevronDownIcon className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-neutral-400" />

          {open && filtered.length > 0 && (
            <ul
              id="customer-picker-listbox"
              role="listbox"
              className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 text-sm shadow-lg"
            >
              {filtered.slice(0, 50).map((c, i) => (
                <li key={c.id} role="option" aria-selected={i === highlight}>
                  <button
                    type="button"
                    className={`flex w-full flex-col px-3 py-2 text-left hover:bg-brand-50 ${
                      i === highlight ? 'bg-brand-50' : ''
                    }`}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => choose(c.id)}
                  >
                    <span className="font-medium text-neutral-900">{c.name}</span>
                    <span className="text-xs text-neutral-500 tabular-nums">
                      Code {c.customerCode ?? '—'} · NIC {c.nic} · {c.phone}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {open && query && filtered.length === 0 && (
            <div className="absolute z-30 mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-4 text-center text-sm text-neutral-500 shadow-lg">
              No customers match your search.
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-brand-200 bg-brand-50/80 p-4 ring-1 ring-brand-100">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">
                Selected customer
              </p>
              <p className="mt-1 text-base font-semibold text-neutral-900">{selected.name}</p>
              <dl className="mt-2 grid grid-cols-1 gap-1 text-xs text-neutral-600 sm:grid-cols-2">
                <div>
                  <dt className="text-neutral-500">Code</dt>
                  <dd className="font-mono font-medium text-neutral-900">{selected.customerCode}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">NIC</dt>
                  <dd className="font-mono font-medium text-neutral-900">{selected.nic}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Phone</dt>
                  <dd className="font-medium text-neutral-900">{selected.phone}</dd>
                </div>
              </dl>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(null)}
              className="rounded-md p-1 text-neutral-500 hover:bg-white hover:text-neutral-800 disabled:opacity-50"
              aria-label="Clear customer"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          to={addCustomerTo}
          className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-500"
        >
          <UserPlusIcon className="h-4 w-4" />
          Add new customer
        </Link>
      </div>
    </div>
  );
}
