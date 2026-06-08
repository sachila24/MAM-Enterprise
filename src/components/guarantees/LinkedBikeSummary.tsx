import type { Bike } from '../../types/entities';
import {
  bikeRegistrationDisplay,
  formatBikeBrandModelLine,
} from '../../lib/display/bikeDisplay';
import { useT } from '../../i18n/I18nProvider';

export function LinkedBikeSummary({ bike }: { bike: Bike }) {
  const { t } = useT();
  return (
    <div className="text-sm">
      <p className="text-xs font-medium text-neutral-500 mb-0.5">{t('linkedBike')}</p>
      <p className="font-semibold text-neutral-900 tabular-nums">
        {bikeRegistrationDisplay(bike, t('notRegistered'))}
      </p>
      <p className="text-neutral-700">{formatBikeBrandModelLine(bike)}</p>
    </div>
  );
}
