/** Round to whole LKR (business amounts are stored/displayed without cents). */
export function roundLKR(amount: number): number {
  return Math.round(amount);
}
