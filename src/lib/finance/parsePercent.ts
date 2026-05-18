/** Allow typing "2.5", "4.5" without stripping the decimal or coercing to integer. */

export function sanitizePercentInput(raw: string): string {
  let s = raw.replace(/[^\d.]/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s =
      s.slice(0, firstDot + 1) +
      s.slice(firstDot + 1).replace(/\./g, '');
  }
  return s;
}

export function parsePercentInput(raw: string): number {
  const t = raw.trim().replace(/,/g, '');
  if (t === '' || t === '.') return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}
