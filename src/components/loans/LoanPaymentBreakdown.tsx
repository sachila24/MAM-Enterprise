import React from 'react';
import { useT } from '../../i18n/I18nProvider';
import { formatLKR } from '../../lib/format';

export interface LoanPaymentBreakdownProps {
  initialPayment: number;
  serviceFee: number;
  registrationFee: number;
  netAdvancePayment: number;
  financedPrincipal: number;
  children?: React.ReactNode;
}

function BreakdownLine({
  label,
  value,
  deduct,
  emphasize,
}: {
  label: string;
  value: number;
  deduct?: boolean;
  emphasize?: boolean;
}) {
  const display = deduct && value > 0 ? `-${formatLKR(value)}` : formatLKR(value);
  return (
    <div
      className={`flex items-baseline gap-2 text-sm ${
        emphasize ? 'font-semibold text-neutral-900 pt-1' : 'text-neutral-800'
      }`}
    >
      <span className="shrink-0 max-w-[55%] leading-snug">{label}</span>
      <span
        className="flex-1 border-b border-dotted border-neutral-400 min-w-[1rem] mb-0.5"
        aria-hidden
      />
      <span
        className={`tabular-nums shrink-0 ${
          deduct ? 'text-danger-700' : emphasize ? 'text-brand-700' : ''
        }`}
      >
        {display}
      </span>
    </div>
  );
}

/** Visual ගෙවූ මුදල − fees = ණයට යෙදෙන අග්‍රිම මුදල (display only). */
export function LoanPaymentBreakdown({
  initialPayment,
  serviceFee,
  registrationFee,
  netAdvancePayment,
  financedPrincipal,
  children,
}: LoanPaymentBreakdownProps) {
  const { t } = useT();

  return (
    <div className="space-y-3">
      {children}
      <div
        className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 space-y-2"
        aria-label={t('paymentBreakdownTitle')}
      >
        <BreakdownLine label={t('initialPayment')} value={initialPayment} />
        <BreakdownLine
          label={t('serviceFeeDeduction')}
          value={serviceFee}
          deduct
        />
        <BreakdownLine
          label={t('registrationFeeDeduction')}
          value={registrationFee}
          deduct
        />
        <div className="border-t border-neutral-300 my-1" role="presentation" />
        <BreakdownLine
          label={t('netAdvancePayment')}
          value={netAdvancePayment}
          emphasize
        />
        <BreakdownLine
          label={t('financedPrincipal')}
          value={financedPrincipal}
          emphasize
        />
      </div>
    </div>
  );
}
