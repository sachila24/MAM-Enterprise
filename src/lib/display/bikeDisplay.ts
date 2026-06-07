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
  bike: Pick<Bike, 'registrationNo' | 'bikeCode'>,
  notRegisteredLabel: string
): string {
  return bike.registrationNo?.trim() || bike.bikeCode?.trim() || notRegisteredLabel;
}

/** Staff-facing bike picker label: `BGR-7113 - TVS Pept` (falls back to bike code). */
export function formatBikeSelectLabel(
  bike: Bike,
  notRegisteredLabel: string
): string {
  const reg = bike.registrationNo?.trim();
  const identifier = reg || bike.bikeCode?.trim() || notRegisteredLabel;
  return `${identifier} - ${bike.model}`;
}

export function formatBikeBrandModelLine(bike: Pick<Bike, 'model'>): string {
  return bike.model.trim() || '—';
}

/**
 * Print-safe bike model line — avoids duplicating brand when model already includes it.
 * e.g. brand=TVS, model=TVS Pept → "TVS Pept" (not "TVS TVS Pept")
 */
export function formatDocumentBikeModel(brand: string, model: string): string {
  const trimmedModel = model.trim();
  if (!trimmedModel || trimmedModel === '—') {
    const trimmedBrand = brand.trim();
    return trimmedBrand && trimmedBrand !== '—' ? trimmedBrand : '—';
  }

  const trimmedBrand = brand.trim();
  if (!trimmedBrand || trimmedBrand === '—') {
    return trimmedModel;
  }

  const brandLower = trimmedBrand.toLowerCase();
  const modelLower = trimmedModel.toLowerCase();

  if (modelLower === brandLower || modelLower.startsWith(`${brandLower} `)) {
    return trimmedModel;
  }

  return `${trimmedBrand} ${trimmedModel}`;
}

/** List/report price — sold bikes use actual sold amount when recorded. */
export function bikeDisplayPrice(bike: Bike): number {
  if (bike.status === 'sold') {
    return bike.soldPrice ?? bike.sellingPrice;
  }
  return bike.sellingPrice;
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
    bike.bikeCode,
    bike.model,
    brand,
    modelName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}
