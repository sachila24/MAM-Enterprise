import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDownIcon, SearchIcon } from 'lucide-react';
import type { Bike } from '../../types/entities';
import {
  formatBikeSelectLabel,
  matchesBikeSearchQuery,
} from '../../lib/display/bikeDisplay';
import { useT } from '../../i18n/I18nProvider';

export interface BikeSearchSelectProps {
  bikes: Bike[];
  selectedBikeId: string | null;
  onSelect: (bikeId: string | null) => void;
  placeholder?: string;
}

export function BikeSearchSelect({
  bikes,
  selectedBikeId,
  onSelect,
  placeholder,
}: BikeSearchSelectProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = selectedBikeId
    ? bikes.find((b) => b.id === selectedBikeId)
    : null;

  const filtered = useMemo(
    () => bikes.filter((b) => matchesBikeSearchQuery(b, search)),
    [bikes, search]
  );

  const triggerLabel = selected
    ? formatBikeSelectLabel(selected, t('notRegistered'))
    : (placeholder ?? t('selectInStockBike'));

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      setSearch('');
    }
  }, [open]);

  const handleSelect = (bikeId: string) => {
    onSelect(bikeId);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-md border-0 bg-white py-2 pl-3 pr-2 text-left text-sm ring-1 ring-inset ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-600"
      >
        <span
          className={`min-w-0 truncate ${selected ? 'font-medium text-neutral-900' : 'text-neutral-500'}`}
        >
          {triggerLabel}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg ring-1 ring-black/5">
          <div className="border-b border-neutral-200 p-2">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchBikes')}
                className="block w-full rounded-md border-0 py-2 pl-9 pr-3 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-200 placeholder:text-neutral-400 focus:ring-2 focus:ring-brand-600"
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <ul
            role="listbox"
            className="max-h-60 overflow-y-auto py-1"
            aria-label={t('selectInStockBike')}
          >
            {filtered.map((b) => (
              <li key={b.id} role="option" aria-selected={b.id === selectedBikeId}>
                <button
                  type="button"
                  onClick={() => handleSelect(b.id)}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-brand-50 ${
                    b.id === selectedBikeId
                      ? 'bg-brand-50 font-medium text-brand-800'
                      : 'text-neutral-900'
                  }`}
                >
                  {formatBikeSelectLabel(b, t('notRegistered'))}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-neutral-500">
                {t('noBikesFound')}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
