import React from 'react';
import { formatEnum } from '../../lib/format';
export type StatusType =
'active' |
'overdue' |
'completed' |
'confirmed' |
'voided' |
'held' |
'in_stock' |
'sold' |
'reserved' |
'released' |
'paid' |
'pending' |
'cancelled';
interface StatusChipProps {
  status: StatusType | string;
  showDot?: boolean;
}
export function StatusChip({ status, showDot = true }: StatusChipProps) {
  const s = status.toLowerCase();
  let colorClass = 'bg-neutral-100 text-neutral-700 ring-neutral-200';
  let dotClass = 'bg-neutral-500';
  if (['active', 'confirmed', 'paid', 'in_stock', 'released', 'returned'].includes(s)) {
    colorClass = 'bg-success-50 text-success-700 ring-success-200';
    dotClass = 'bg-success-500';
  } else if (['overdue', 'danger', 'cancelled'].includes(s)) {
    colorClass = 'bg-danger-50 text-danger-700 ring-danger-200';
    dotClass = 'bg-danger-500';
  } else if (['partial'].includes(s)) {
    colorClass = 'bg-info-50 text-info-700 ring-info-200';
    dotClass = 'bg-info-500';
  } else if (['held', 'warning', 'pending', 'reserved'].includes(s)) {
    colorClass = 'bg-warning-50 text-warning-700 ring-warning-200';
    dotClass = 'bg-warning-500';
  } else if (['info'].includes(s)) {
    colorClass = 'bg-info-50 text-info-700 ring-info-200';
    dotClass = 'bg-info-500';
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${colorClass}`}>
      
      {showDot &&
      <span
        className={`h-1.5 w-1.5 rounded-full ${dotClass}`}
        aria-hidden="true" />

      }
      {formatEnum(status)}
    </span>);

}