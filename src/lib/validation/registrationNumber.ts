/**
 * Canonical key for Sri Lankan vehicle registration comparison.
 * "BGZ-0602", "BGZ 0602", and "BGZ0602" all map to "bgz0602".
 */
export function normalizeRegistrationNumber(registrationNo: string): string {
  return registrationNo
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
