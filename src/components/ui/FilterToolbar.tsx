import React from 'react';
import { SearchIcon } from 'lucide-react';
interface FilterToolbarProps {
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
}
export function FilterToolbar({
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters
}: FilterToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1 max-w-md">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <SearchIcon className="h-4 w-4 text-neutral-400" aria-hidden="true" />
        </div>
        <input
          type="text"
          className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-neutral-900 ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
          placeholder={searchPlaceholder}
          onChange={(e) => onSearchChange?.(e.target.value)} />
        
      </div>
      {filters &&
      <div className="flex items-center gap-3 overflow-x-auto pb-2 sm:pb-0">
          {filters}
        </div>
      }
    </div>);

}