import { formatLKR, formatEnum } from '../../lib/format';
import type { Bike } from '../../types/entities';
import type { PaymentMethod } from '../../types/loan';
import { useT } from '../../i18n/I18nProvider';

export interface CashSalePreviewSummaryProps {
  bike: Bike;
  customerName: string;
  sellingPrice: number;
  discountAmount: number;
  additionalCharges: number;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  soldBy?: string;
  prominent?: boolean;
}

export function CashSalePreviewSummary({
  bike,
  customerName,
  sellingPrice,
  discountAmount,
  additionalCharges,
  finalAmount,
  paymentMethod,
  soldBy,
  prominent = false,
}: CashSalePreviewSummaryProps) {
  const { t } = useT();

  return (
    <div
      className={
        prominent
          ? 'rounded-xl bg-gradient-to-br from-success-50 to-brand-50 ring-2 ring-success-200 p-5 shadow-sm'
          : 'rounded-xl bg-neutral-50 ring-1 ring-neutral-200 p-5'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-neutral-900">
          {t('cashSalePreviewSummary')}
        </h3>
        <span className="inline-flex items-center rounded-full bg-success-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
          {t('fullyPaidCashSaleBadge')}
        </span>
      </div>

      <dl className="space-y-2.5 text-sm">
        <SummaryLine label={t('field.bike')} value={`${bike.bikeCode} · ${bike.model}`} />
        <SummaryLine label={t('field.customer')} value={customerName || '—'} />
        <SummaryLine label={t('sellingPriceLabel')} value={formatLKR(sellingPrice)} />
        <SummaryLine
          label={t('discount')}
          value={discountAmount > 0 ? `−${formatLKR(discountAmount)}` : formatLKR(0)}
        />
        <SummaryLine
          label={t('additionalCharges')}
          value={formatLKR(additionalCharges)}
        />
        <div className="border-t border-success-200/80 pt-3 mt-3">
          <SummaryLine
            label={t('finalAmount')}
            value={formatLKR(finalAmount)}
            bold
          />
        </div>
        <SummaryLine
          label={t('paymentMethod')}
          value={formatEnum(paymentMethod)}
        />
        {soldBy && (
          <SummaryLine label={t('soldByLabel')} value={soldBy} />
        )}
      </dl>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-neutral-600 shrink-0">{label}</dt>
      <dd
        className={`text-right tabular-nums ${bold ? 'text-lg font-bold text-success-800' : 'font-medium text-neutral-900'}`}
      >
        {value}
      </dd>
    </div>
  );
}
