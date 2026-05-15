import React, { useEffect, useState } from 'react';
interface CurrencyInputProps extends
  Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'onChange' | 'value'>
{
  value?: number;
  onChange?: (value: number) => void;
  label?: string;
  error?: string;
}
export function CurrencyInput({
  value,
  onChange,
  label,
  error,
  className = '',
  ...props
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  useEffect(() => {
    if (value !== undefined && value !== null && !isNaN(value)) {
      setDisplayValue(value.toLocaleString('en-US'));
    } else {
      setDisplayValue('');
    }
  }, [value]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      setDisplayValue('');
      onChange?.(0);
      return;
    }
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      setDisplayValue(num.toLocaleString('en-US'));
      onChange?.(num);
    }
  };
  return (
    <div className="w-full">
      {label &&
      <label className="block text-sm font-medium leading-6 text-neutral-900 mb-1">
          {label}
        </label>
      }
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span className="text-neutral-500 sm:text-sm font-medium">LKR</span>
        </div>
        <input
          type="text"
          className={`block w-full rounded-md border-0 py-1.5 pl-12 pr-3 text-neutral-900 ring-1 ring-inset tabular-nums ${error ? 'ring-danger-300 focus:ring-danger-500' : 'ring-neutral-300 focus:ring-brand-600'} placeholder:text-neutral-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${className}`}
          value={displayValue}
          onChange={handleChange}
          {...props} />
        
      </div>
      {error && <p className="mt-1 text-sm text-danger-600">{error}</p>}
    </div>);

}