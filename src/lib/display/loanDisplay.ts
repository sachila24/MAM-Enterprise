import type { Loan } from '../../types/entities';
import { formatEnum, getFormatDisplayMode } from '../format';
import { getLabel, type DisplayMode } from '../i18n/simpleLabels';
import { getLoan } from '../local-db/repositories/loansRepo';
import type { MamDemoDb } from '../local-db/types';

/** Staff-facing loan type in payment flows and summaries. */
export function formatLoanTypeLabel(
  loan: Pick<Loan, 'loanPurpose' | 'repaymentMethod'>,
  mode?: DisplayMode
): string {
  const displayMode = mode ?? getFormatDisplayMode();
  if (loan.loanPurpose === 'BIKE_INSTALLMENT') {
    return getLabel('bikeLoan', displayMode);
  }
  return formatEnum(loan.repaymentMethod, displayMode);
}

export function buildLoanCodeById(
  loans: Pick<Loan, 'id' | 'loanCode'>[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const loan of loans) {
    if (loan.loanCode) map.set(loan.id, loan.loanCode);
  }
  return map;
}

/** Staff-facing loan number; never returns internal UUID. */
export function resolveLoanCode(
  loanId: string | null | undefined,
  codeById?: Map<string, string>,
  db?: MamDemoDb
): string {
  if (!loanId) return '—';
  const fromMap = codeById?.get(loanId);
  if (fromMap) return fromMap;
  if (db) {
    const loan = getLoan(loanId, db);
    if (loan?.loanCode) return loan.loanCode;
  }
  return '—';
}
