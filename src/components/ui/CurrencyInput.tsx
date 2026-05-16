import React, { useEffect, useState } from 'react';
import { roundLKR } from '../../lib/finance/money';

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value?: number;
  onChange?: (value: number) => void;
  label?: string;
  error?: string;
}

function formatMoneyDisplay(n: number): string {
  if (n === 0 || Number.isNaN(n)) return '';
  const hasFraction = Math.abs(n % 1) > 1e-9;
  return n.toLocaleString('en-US', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/** Allow typing: digits, one decimal point, commas; parse safely for LKR. */
export function parseMoneyInput(raw: string): number {
  const cleaned = raw.replace(/,/g, '').trim();
  if (cleaned === '' || cleaned === '.') return 0;
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  return roundLKR(n);
}

export function CurrencyInput({
  value,
  onChange,
  label,
  error,
  className = '',
  disabled,
  ...props
}: CurrencyInputProps) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() =>
    value !== undefined && value !== 0 ? formatMoneyDisplay(value) : ''
  );

  useEffect(() => {
    if (focused) return;
    const v = value ?? 0;
    setText(v === 0 ? '' : formatMoneyDisplay(v));
  }, [value, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let next = e.target.value;
    if (next === '') {
      setText('');
      onChange?.(0);
      return;
    }
    next = next.replace(/[^\d.,]/g, '');
    const dot = next.indexOf('.');
    if (dot !== -1) {
      next = next.slice(0, dot + 1) + next.slice(dot + 1).replace(/\./g, '');
      const [intPart, frac = ''] = next.split('.');
      next = intPart + '.' + frac.slice(0, 2);
    }
    setText(next);
    onChange?.(parseMoneyInput(next));
  };

  const handleBlur = () => {
    setFocused(false);
    const p = parseMoneyInput(text);
    onChange?.(p);
    setText(p === 0 ? '' : formatMoneyDisplay(p));
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium leading-6 text-neutral-900 mb-1">{label}</label>
      )}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span className="text-neutral-500 sm:text-sm font-medium">LKR</span>
        </div>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          className={`block w-full rounded-md border-0 py-1.5 pl-12 pr-3 text-neutral-900 ring-1 ring-inset tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${error ? 'ring-danger-300 focus:ring-danger-500' : 'ring-neutral-300 focus:ring-brand-600'} placeholder:text-neutral-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${disabled ? 'bg-neutral-50 opacity-60 cursor-not-allowed' : ''} ${className}`}
          value={text}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-danger-600">{error}</p>}
    </div>
  );
}
