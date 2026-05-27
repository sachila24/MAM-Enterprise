import React from 'react';
import { useT } from '../../i18n/I18nProvider';
import { formatLKR } from '../../lib/format';

export interface LoanOriginationSummaryCardProps {
  loanAmount: number;
  initialPayment: number;
  serviceFee: number;
  registrationFee: number;
  netAdvancePayment: number;
  financedPrincipal: number;
  children?: React.ReactNode;
}

export function LoanOriginationSummaryCard({
  loanAmount,
  initialPayment,
  serviceFee,
  registrationFee,
  netAdvancePayment,
  financedPrincipal,
  children,
}: LoanOriginationSummaryCardProps) {
  const { t } = useT();
  const rows = [
    { label: t('loanAmountField'), value: loanAmount },
    { label: t('initialPayment'), value: initialPayment },
    { label: t('serviceFee'), value: serviceFee },
    { label: t('registrationFee'), value: registrationFee },
    { label: t('netAdvancePayment'), value: netAdvancePayment },
    { label: t('financedPrincipal'), value: financedPrincipal },
  ];
  return (
    <dl className="space-y-3 text-sm mb-4 pb-4 border-b border-brand-700">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-4">
          <dt className="text-brand-200">{row.label}</dt>
          <dd className="tabular-nums">{formatLKR(row.value)}</dd>
        </div>
      ))}
      {children}
    </dl>
  );
}
