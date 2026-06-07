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
  /** Tighter padding for dense dashboards (e.g. loan detail summary). */
  compact?: boolean;
}
export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  compact = false,
}: KpiCardProps) {
  return (
    <div
      className={
        compact
          ? 'flex h-full min-h-[5.25rem] flex-col overflow-hidden rounded-lg bg-white px-3 py-3 shadow-sm ring-1 ring-neutral-200'
          : 'overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm ring-1 ring-neutral-200 sm:p-6'
      }
    >
      <div className="flex items-start justify-between gap-2">
        <dt
          className={`min-w-0 leading-snug whitespace-normal break-words text-neutral-500 ${
            compact
              ? 'text-[11px] font-medium uppercase tracking-wide'
              : 'text-xs sm:text-sm font-medium'
          }`}
        >
          {label}
        </dt>
        {Icon && (
          <Icon className="h-5 w-5 shrink-0 text-neutral-400" aria-hidden="true" />
        )}
      </div>
      <dd
        className={`flex flex-1 items-end gap-x-2 ${
          compact ? 'mt-1' : 'mt-2'
        }`}
      >
        <span
          className={`font-semibold tracking-tight text-neutral-900 tabular-nums ${
            compact ? 'text-xl sm:text-2xl leading-tight' : 'text-3xl'
          }`}
        >
          {value}
        </span>
        {delta && (
          <span
            className={`text-sm font-medium ${delta.trend === 'up' ? 'text-success-600' : delta.trend === 'down' ? 'text-danger-600' : 'text-neutral-500'}`}
          >
            {delta.trend === 'up' ? '↑' : delta.trend === 'down' ? '↓' : ''}{' '}
            {delta.value}
          </span>
        )}
      </dd>
    </div>
  );
}