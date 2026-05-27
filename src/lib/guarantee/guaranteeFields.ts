import type { CreateGuaranteeDraft } from '../local-db/repositories/loansRepo';
import type { Guarantee } from '../../types/entities';
import type { LabelKey } from '../i18n/simpleLabels';

/** Simplified guarantee form / persistence fields (all optional). */
export interface GuaranteeFieldValues {
  fileNumber: string;
  vehicleNumber: string;
  guarantor1Name: string;
  guarantor1Address: string;
  guarantor1Phone: string;
  guarantor1Nic: string;
  guarantor2Name: string;
  guarantor2Address: string;
  guarantor2Phone: string;
  guarantor2Nic: string;
}

export type LocalGuaranteeDraft = GuaranteeFieldValues & { key: string };

export function emptyGuaranteeDraft(): LocalGuaranteeDraft {
  return {
    key: crypto.randomUUID(),
    fileNumber: '',
    vehicleNumber: '',
    guarantor1Name: '',
    guarantor1Address: '',
    guarantor1Phone: '',
    guarantor1Nic: '',
    guarantor2Name: '',
    guarantor2Address: '',
    guarantor2Phone: '',
    guarantor2Nic: '',
  };
}

function trimOptional(s: string): string | undefined {
  const t = s.trim();
  return t || undefined;
}

export function hasGuaranteeDraftContent(
  g: GuaranteeFieldValues | LocalGuaranteeDraft
): boolean {
  const {
    fileNumber,
    vehicleNumber,
    guarantor1Name,
    guarantor1Address,
    guarantor1Phone,
    guarantor1Nic,
    guarantor2Name,
    guarantor2Address,
    guarantor2Phone,
    guarantor2Nic,
  } = g;
  return [
    fileNumber,
    vehicleNumber,
    guarantor1Name,
    guarantor1Address,
    guarantor1Phone,
    guarantor1Nic,
    guarantor2Name,
    guarantor2Address,
    guarantor2Phone,
    guarantor2Nic,
  ].some((v) => v.trim() !== '');
}

export function mapGuaranteeDraftsToCreate(
  drafts: LocalGuaranteeDraft[]
): CreateGuaranteeDraft[] {
  return drafts.filter(hasGuaranteeDraftContent).map((g) => ({
    fileNumber: trimOptional(g.fileNumber),
    vehicleNumber: trimOptional(g.vehicleNumber),
    guarantor1Name: trimOptional(g.guarantor1Name),
    guarantor1Address: trimOptional(g.guarantor1Address),
    guarantor1Phone: trimOptional(g.guarantor1Phone),
    guarantor1Nic: trimOptional(g.guarantor1Nic),
    guarantor2Name: trimOptional(g.guarantor2Name),
    guarantor2Address: trimOptional(g.guarantor2Address),
    guarantor2Phone: trimOptional(g.guarantor2Phone),
    guarantor2Nic: trimOptional(g.guarantor2Nic),
  }));
}

/** Primary line for cards/lists — prefers new fields, falls back to legacy description. */
export function guaranteePrimaryLabel(g: Guarantee): string {
  const parts = [
    g.fileNumber,
    g.vehicleNumber ?? g.itemReference,
    g.guarantor1Name ?? g.ownerNameOnDocument,
    g.guarantor2Name,
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(' · ');
  if (g.description.trim()) return g.description;
  return g.guaranteeCode;
}

export function guaranteeDetailLines(
  g: Guarantee,
  label: (key: LabelKey) => string
): Array<{ label: string; value: string }> {
  const lines: Array<{ label: string; value: string }> = [];
  const add = (key: LabelKey, value: string | undefined) => {
    if (value?.trim()) lines.push({ label: label(key), value: value.trim() });
  };
  add('fileNumber', g.fileNumber);
  add('vehicleNumber', g.vehicleNumber ?? g.itemReference);
  add('guarantor1', g.guarantor1Name ?? g.ownerNameOnDocument);
  add('guarantorAddress', g.guarantor1Address);
  add('guarantorPhone', g.guarantor1Phone);
  add('guarantorNic', g.guarantor1Nic);
  add('guarantor2', g.guarantor2Name);
  add('guarantorAddress', g.guarantor2Address);
  add('guarantorPhone', g.guarantor2Phone);
  add('guarantorNic', g.guarantor2Nic);
  if (lines.length === 0 && g.description.trim()) {
    lines.push({ label: label('csvDescription'), value: g.description });
  }
  if (g.storageLocation.trim()) {
    lines.push({ label: label('storageLocation'), value: g.storageLocation });
  }
  return lines;
}
