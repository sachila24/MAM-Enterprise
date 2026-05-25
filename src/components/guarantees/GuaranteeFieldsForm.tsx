import React from 'react';
import type { GuaranteeFieldValues } from '../../lib/guarantee/guaranteeFields';
import { useT } from '../../i18n/I18nProvider';

type Props = {
  values: GuaranteeFieldValues;
  onChange: (patch: Partial<GuaranteeFieldValues>) => void;
};

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-700 mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-md border-0 py-1.5 px-2 ring-1 ring-inset ring-neutral-300 text-sm"
      />
    </div>
  );
}

export function GuaranteeFieldsForm({ values, onChange }: Props) {
  const { t } = useT();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-neutral-800">
          {t('guaranteeInformation')}
        </p>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField
            label={t('fileNumber')}
            value={values.fileNumber}
            onChange={(fileNumber) => onChange({ fileNumber })}
          />
          <TextField
            label={t('vehicleNumber')}
            value={values.vehicleNumber}
            onChange={(vehicleNumber) => onChange({ vehicleNumber })}
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-neutral-800">
          {t('guarantor1')}
        </p>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField
            label={t('guarantorName')}
            value={values.guarantor1Name}
            onChange={(guarantor1Name) => onChange({ guarantor1Name })}
          />
          <TextField
            label={t('guarantorNic')}
            value={values.guarantor1Nic}
            onChange={(guarantor1Nic) => onChange({ guarantor1Nic })}
          />
          <TextField
            label={t('guarantorPhone')}
            value={values.guarantor1Phone}
            onChange={(guarantor1Phone) => onChange({ guarantor1Phone })}
          />
          <div className="sm:col-span-2">
            <TextField
              label={t('guarantorAddress')}
              value={values.guarantor1Address}
              onChange={(guarantor1Address) => onChange({ guarantor1Address })}
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-neutral-800">
          {t('guarantor2')}
        </p>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField
            label={t('guarantorName')}
            value={values.guarantor2Name}
            onChange={(guarantor2Name) => onChange({ guarantor2Name })}
          />
          <TextField
            label={t('guarantorNic')}
            value={values.guarantor2Nic}
            onChange={(guarantor2Nic) => onChange({ guarantor2Nic })}
          />
          <TextField
            label={t('guarantorPhone')}
            value={values.guarantor2Phone}
            onChange={(guarantor2Phone) => onChange({ guarantor2Phone })}
          />
          <div className="sm:col-span-2">
            <TextField
              label={t('guarantorAddress')}
              value={values.guarantor2Address}
              onChange={(guarantor2Address) => onChange({ guarantor2Address })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
