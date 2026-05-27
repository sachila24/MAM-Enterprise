import React from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { useT } from '../../i18n/I18nProvider';
import { formatLKR } from '../../lib/format';

export interface OriginationFeesFieldsProps {
  initialPayment: number;
  serviceFee: number;
  registrationFee: number;
  netAdvancePayment: number;
  onInitialPaymentChange: (value: number) => void;
  onServiceFeeChange: (value: number) => void;
  onRegistrationFeeChange: (value: number) => void;
}

export function OriginationFeesFields({
  initialPayment,
  serviceFee,
  registrationFee,
  netAdvancePayment,
  onInitialPaymentChange,
  onServiceFeeChange,
  onRegistrationFeeChange,
}: OriginationFeesFieldsProps) {
  const { t } = useT();
  return (
    <div className="rounded-lg bg-neutral-50 ring-1 ring-neutral-200 p-4 space-y-4">
      <h4 className="text-sm font-semibold text-neutral-900">
        {t('originationPaymentSection')}
      </h4>
      <CurrencyInput
        label={t('initialPayment')}
        value={initialPayment}
        onChange={onInitialPaymentChange}
      />
      <CurrencyInput
        label={t('serviceFee')}
        value={serviceFee}
        onChange={onServiceFeeChange}
      />
      <CurrencyInput
        label={t('registrationFee')}
        value={registrationFee}
        onChange={onRegistrationFeeChange}
      />
      <div className="flex justify-between text-sm border-t border-neutral-200 pt-3">
        <span className="text-neutral-600">{t('netAdvancePayment')}</span>
        <span className="font-semibold text-neutral-900 tabular-nums">
          {formatLKR(netAdvancePayment)}
        </span>
      </div>
    </div>
  );
}
