import React from 'react';
import { BoxIcon } from 'lucide-react';
interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: BoxIcon;
}
export function KpiCard({ label, value, delta, icon: Icon }: KpiCardProps) {
  return (
    <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm ring-1 ring-neutral-200 sm:p-6">
      <div className="flex items-center justify-between">
        <dt className="truncate text-sm font-medium text-neutral-500 uppercase tracking-wider">
          {label}
        </dt>
        {Icon &&
        <Icon className="h-5 w-5 text-neutral-400" aria-hidden="true" />
        }
      </div>
      <dd className="mt-2 flex items-baseline gap-x-2">
        <span className="text-3xl font-semibold tracking-tight text-neutral-900 tabular-nums">
          {value}
        </span>
        {delta &&
        <span
          className={`text-sm font-medium ${delta.trend === 'up' ? 'text-success-600' : delta.trend === 'down' ? 'text-danger-600' : 'text-neutral-500'}`}>
          
            {delta.trend === 'up' ? '↑' : delta.trend === 'down' ? '↓' : ''}{' '}
            {delta.value}
          </span>
        }
      </dd>
    </div>);

}