import type { DisplayMode } from './simpleLabels';
import {
  document as documentEn,
  type DocumentLabelKey,
} from './locales/en';
import { document as documentSi } from './locales/si';

export type { DocumentLabelKey };

export function getDocumentLabel(
  key: DocumentLabelKey,
  mode: DisplayMode = 'both'
): string {
  const en = documentEn[key];
  const si = documentSi[key];
  if (mode === 'en') return en;
  if (mode === 'si') return si;
  return `${en} / ${si}`;
}

export function getDocumentLabels(mode: DisplayMode = 'both') {
  return Object.fromEntries(
    (Object.keys(documentEn) as DocumentLabelKey[]).map((k) => [
      k,
      getDocumentLabel(k, mode),
    ])
  ) as Record<DocumentLabelKey, string>;
}
