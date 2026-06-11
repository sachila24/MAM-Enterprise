import type { Bike } from '../../types/entities';
import type { LocalGuaranteeDraft } from '../../lib/guarantee/guaranteeFields';
import { hasGuaranteeDraftContent } from '../../lib/guarantee/guaranteeFields';
import { formatBikeSelectLabel } from '../../lib/display/bikeDisplay';
import { useT } from '../../i18n/I18nProvider';

function displayField(value: string | undefined): string {
  const t = value?.trim();
  return t || '—';
}

export interface GuaranteeDraftSummaryProps {
  draft: LocalGuaranteeDraft;
  linkedBike?: Bike | null;
}

export function GuaranteeDraftSummary({
  draft,
  linkedBike,
}: GuaranteeDraftSummaryProps) {
  const { t } = useT();

  if (!hasGuaranteeDraftContent(draft)) {
    return null;
  }

  const linkedBikeLine = linkedBike
    ? formatBikeSelectLabel(linkedBike, t('notRegistered'))
    : null;

  return (
    <div className="rounded-md bg-neutral-50 px-3 py-3 ring-1 ring-inset ring-neutral-200 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
        {t('guaranteeInformation')}
      </p>
      <dl className="space-y-1.5">
        <div className="flex gap-2">
          <dt className="text-neutral-500 shrink-0">{t('fileNumber')}:</dt>
          <dd className="font-medium text-neutral-900 tabular-nums">
            {displayField(draft.fileNumber)}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-neutral-500 shrink-0">{t('vehicleNumber')}:</dt>
          <dd className="font-medium text-neutral-900 tabular-nums">
            {displayField(draft.vehicleNumber)}
          </dd>
        </div>
        {linkedBikeLine && (
          <div className="flex gap-2">
            <dt className="text-neutral-500 shrink-0">{t('linkedBike')}:</dt>
            <dd className="font-medium text-neutral-900">{linkedBikeLine}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
