import type { Bike } from '../../types/entities';

/** Split stored model string into brand + remainder (display only). */
export function parseBikeBrandModel(model: string): {
  brand: string;
  modelName: string;
} {
  const parts = model.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { brand: '—', modelName: '—' };
  if (parts.length === 1) return { brand: parts[0], modelName: parts[0] };
  return { brand: parts[0], modelName: parts.slice(1).join(' ') };
}

export function bikeRegistrationDisplay(
  bike: Pick<Bike, 'registrationNo'>,
  notRegisteredLabel: string
): string {
  return bike.registrationNo?.trim() || notRegisteredLabel;
}

/** Staff-facing bike picker label: `WP CAB-1234 - TVS Pept` */
export function formatBikeSelectLabel(
  bike: Bike,
  notRegisteredLabel: string
): string {
  return `${bikeRegistrationDisplay(bike, notRegisteredLabel)} - ${bike.model}`;
}

export function formatBikeBrandModelLine(bike: Pick<Bike, 'model'>): string {
  return bike.model.trim() || '—';
}

export function matchesBikeSearchQuery(
  bike: Bike,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const { brand, modelName } = parseBikeBrandModel(bike.model);
  const haystack = [
    bike.registrationNo,
    bike.model,
    brand,
    modelName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}
