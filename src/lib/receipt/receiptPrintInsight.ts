import type {
  FixedInstallmentReceiptBreakdown,
  InterestOnlyReceiptBreakdown,
} from '../finance/receipt';
import { roundLKR } from '../finance/money';
import { isFixedInstallmentLoan, isInterestOnlyLoan } from '../../types/loan';
import type { Loan, RepaymentMethod } from '../../types/loan';

export type InstallmentCoverageStatus = 'full' | 'partial' | 'none';

/** Display-only snapshot passed at payment time (no finance recalculation). */
export interface ReceiptPrintInsightInput {
  balanceBefore?: number;
  nextInstallmentDate?: string;
  currentMonthDue?: number;
  currentMonthPaid?: number;
  lateFeesDueBefore?: number;
}

export interface ReceiptPrintInsight {
  balanceBefore: number;
  nextInstallmentDate?: string;
  installmentCoverage: InstallmentCoverageStatus;
  lateFeeSettled?: boolean;
  showLateFeeSettled: boolean;
}

export function buildReceiptPrintInsight(
  repaymentMethod: RepaymentMethod,
  receipt: InterestOnlyReceiptBreakdown | FixedInstallmentReceiptBreakdown,
  input: ReceiptPrintInsightInput = {}
): ReceiptPrintInsight {
  const loanStub = { repaymentMethod } as Pick<Loan, 'repaymentMethod'>;

  let balanceBefore = input.balanceBefore;
  if (balanceBefore == null) {
    if (isFixedInstallmentLoan(loanStub) && 'loanBalance' in receipt) {
      const advance = receipt.advancePaid ?? 0;
      balanceBefore = roundLKR(receipt.loanBalance + receipt.totalApplied - advance);
    } else if (
      isInterestOnlyLoan(loanStub) &&
      'remainingPrincipal' in receipt
    ) {
      balanceBefore = roundLKR(
        receipt.remainingPrincipal + (receipt.principalPaid ?? 0)
      );
    } else {
      balanceBefore = 0;
    }
  }

  let installmentCoverage: InstallmentCoverageStatus = 'none';
  let lateFeeSettled: boolean | undefined;
  let showLateFeeSettled = false;

  if (isFixedInstallmentLoan(loanStub) && 'installmentPaid' in receipt) {
    const currentMonthDue = input.currentMonthDue ?? 0;
    const currentMonthPaid = input.currentMonthPaid ?? 0;

    if (currentMonthDue > 0 && currentMonthPaid > 0) {
      installmentCoverage =
        currentMonthPaid >= currentMonthDue ? 'full' : 'partial';
    } else if (receipt.installmentPaid > 0 && receipt.remainingArrears === 0) {
      installmentCoverage = 'full';
    } else if (receipt.installmentPaid > 0) {
      installmentCoverage = 'partial';
    }

    const lateFeesDueBefore = input.lateFeesDueBefore ?? 0;
    const lateFeePaid = receipt.lateFeePaid ?? 0;
    if (lateFeesDueBefore > 0 || lateFeePaid > 0) {
      showLateFeeSettled = true;
      lateFeeSettled =
        lateFeesDueBefore > 0
          ? lateFeePaid >= lateFeesDueBefore
          : lateFeePaid > 0;
    }
  }

  return {
    balanceBefore,
    nextInstallmentDate: input.nextInstallmentDate,
    installmentCoverage,
    lateFeeSettled,
    showLateFeeSettled,
  };
}

export function formatReceiptInsightDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
