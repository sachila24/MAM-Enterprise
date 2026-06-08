import React from 'react';
import { CalendarIcon } from 'lucide-react';
import { toDateInputValue } from '../../lib/time/systemTime';

interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function DatePicker({
  label,
  error,
  className = '',
  value,
  onChange,
  ...props
}: DatePickerProps) {
  const inputValue = toDateInputValue(value);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium leading-6 text-neutral-900 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <CalendarIcon className="h-4 w-4 text-neutral-400" />
        </div>
        <input
          type="date"
          className={`block w-full rounded-md border-0 py-1.5 pl-10 text-neutral-900 ring-1 ring-inset ${error ? 'ring-danger-300 focus:ring-danger-500' : 'ring-neutral-300 focus:ring-brand-600'} placeholder:text-neutral-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${className}`}
          value={inputValue}
          onChange={onChange}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-danger-600">{error}</p>}
    </div>
  );
}