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
  interestAmount?: number;
  totalPayable?: number;
  monthlyInstallment?: number;
  children?: React.ReactNode;
}

export function LoanOriginationSummaryCard({
  loanAmount,
  initialPayment,
  serviceFee,
  registrationFee,
  netAdvancePayment,
  financedPrincipal,
  interestAmount,
  totalPayable,
  monthlyInstallment,
  children,
}: LoanOriginationSummaryCardProps) {
  const { t } = useT();
  const rows: { label: string; value: number; highlight?: boolean }[] = [
    { label: t('loanAmountField'), value: loanAmount },
    { label: t('initialPayment'), value: initialPayment },
    { label: t('serviceFee'), value: serviceFee },
    { label: t('registrationFee'), value: registrationFee },
    { label: t('netAdvancePayment'), value: netAdvancePayment },
    { label: t('financedPrincipal'), value: financedPrincipal },
  ];
  if (interestAmount !== undefined) {
    rows.push({ label: t('totalInterest'), value: interestAmount });
  }
  if (totalPayable !== undefined) {
    rows.push({ label: t('totalPayable'), value: totalPayable });
  }
  if (monthlyInstallment !== undefined) {
    rows.push({
      label: t('monthlyInstallment'),
      value: monthlyInstallment,
      highlight: true,
    });
  }

  return (
    <>
      <dl className="space-y-3 text-sm mb-4 pb-4 border-b border-brand-700">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4">
            <dt className={row.highlight ? 'text-brand-100 font-medium' : 'text-brand-200'}>
              {row.label}
            </dt>
            <dd
              className={`tabular-nums ${
                row.highlight ? 'text-xl font-bold' : 'font-medium'
              }`}
            >
              {formatLKR(row.value)}
            </dd>
          </div>
        ))}
      </dl>
      {children}
    </>
  );
}
