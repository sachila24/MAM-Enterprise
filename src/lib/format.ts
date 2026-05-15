export function formatEnum(value: string | null | undefined): string {
  if (!value || value === '__unset__') return '—';

  const map: Record<string, string> = {
    VEHICLE_BOOK: 'Vehicle book',
    MONTHLY: 'Monthly',
    CASH: 'Cash',
    SOLD: 'Sold',
    IN_STOCK: 'In stock',
    CONFIRMED: 'Confirmed',
    ACTIVE: 'Active',
    OVERDUE: 'Overdue',
    COMPLETED: 'Completed',
    VOIDED: 'Voided',
    HELD: 'Held',
    RESERVED: 'Reserved',
    RELEASED: 'Released',
    PAID: 'Paid',
    PENDING: 'Pending',
    CANCELLED: 'Cancelled'
  };

  if (map[value]) return map[value];

  return value.
  toLowerCase().
  replace(/_/g, ' ').
  replace(/^\w/, (c) => c.toUpperCase());
}

export function formatLKR(
amount: number,
opts?: {withSymbol?: boolean;})
: string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'LKR 0';

  const formatted = Math.round(amount).toLocaleString('en-US');
  return opts?.withSymbol === false ? formatted : `LKR ${formatted}`;
}

export function formatDate(
date: Date | string,
format: 'short' | 'long' = 'short')
: string {
  if (!date) return '—';
  const d = new Date(date);

  if (format === 'long') {
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatDateTime(date: Date | string): string {
  if (!date) return '—';
  const d = new Date(date);

  const datePart = d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const timePart = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return `${datePart}, ${timePart}`;
}

export function truncateId(id: string, len = 8): string {
  if (!id) return '—';
  return id.slice(-len);
}