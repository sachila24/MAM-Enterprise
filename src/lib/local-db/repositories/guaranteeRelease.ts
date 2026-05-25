import type { DbLoan, MamDemoDb } from '../types';

export function isLoanFullySettled(loan: DbLoan): boolean {
  return loan.status === 'COMPLETED' || loan.status === 'SETTLED';
}

/** Release all HELD guarantees when the full loan is finished (not partial payments). */
export function autoReleaseGuaranteesForSettledLoan(
  db: MamDemoDb,
  loanId: string,
  releasedAt: string
): void {
  const releasedAtIso = releasedAt.includes('T')
    ? releasedAt
    : `${releasedAt}T12:00:00.000Z`;

  for (const g of db.guarantees) {
    if (g.loan_id !== loanId || g.status === 'RELEASED') continue;
    g.status = 'RELEASED';
    g.released_at = releasedAtIso;
  }
}

/** Call after loan status may have changed to COMPLETED / SETTLED. */
export function autoReleaseGuaranteesIfLoanJustSettled(
  db: MamDemoDb,
  loan: DbLoan,
  wasSettled: boolean,
  releaseDate: string
): void {
  if (wasSettled || !isLoanFullySettled(loan)) return;
  autoReleaseGuaranteesForSettledLoan(db, loan.id, releaseDate);
}
