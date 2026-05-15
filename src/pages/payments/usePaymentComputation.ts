import { useMemo } from 'react';
import type { Loan } from '../../types/entities';
import type { PaymentMethod } from '../../types/loan';
import { isFixedInstallmentLoan, isInterestOnlyLoan } from '../../types/loan';
import {
  buildFixedInstallmentAllocationRows,
  buildInterestOnlyAllocationRows,
} from '../../lib/finance/allocationDisplay';
import {
  allocateFixedInstallmentPayment,
  allocateInterestOnlyPaymentLines,
  summarizeFixedInstallmentDue,
  type InstallmentForAllocation,
} from '../../lib/finance/paymentAllocation';
import {
  getFixedLoanArrearsSummary,
  resolveCurrentInstallmentNumber,
  type InstallmentArrearsInput,
} from '../../lib/finance/fixedInstallmentStatus';
import {
  buildFixedInstallmentReceipt,
  buildInterestOnlyReceipt,
} from '../../lib/finance/receipt';
import {
  interestOutstandingOnCycle,
  totalPendingInterest,
  type InterestCycleForAllocation,
} from '../../lib/finance/interestOnly';
import { calculateMonthlyInterestDue } from '../../lib/finance/interestOnly';
import {
  splitAllocationsCashAndDiscount,
  summarizeLinesForFixedPayment,
  summarizeLinesForInterestOnlyPayment,
} from '../../lib/finance/paymentDiscountSplit';
import {
  getNextDueDateForFixedInstallments,
  getNextDueDateForInterestOnly,
} from '../../lib/finance/loanNextDue';
import type { PaymentPreviewBundle } from './paymentPreviewData';
import type { PaymentAllocationResult } from '../../lib/finance/paymentAllocation';
import { roundLKR } from '../../lib/finance/money';

export interface PaymentFormState {
  amount: number;
  discountAmount?: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  notes: string;
  chequeNumber: string;
  bankReference: string;
}

function sumAlloc(lines: PaymentAllocationResult['allocations']): number {
  return roundLKR(lines.reduce((s, l) => s + l.amount, 0));
}

export function usePaymentComputation(
  loan: Loan | null | undefined,
  bundle: PaymentPreviewBundle | null,
  form: PaymentFormState
) {
  const cash = roundLKR(form.amount);
  const disc = roundLKR(form.discountAmount ?? 0);
  const totalApply = roundLKR(cash + disc);

  const cycles: InterestCycleForAllocation[] = useMemo(() => {
    if (!loan || !bundle) return [];
    return bundle.interestCyclesByLoanId[loan.id] ?? [];
  }, [loan, bundle]);

  const installments: InstallmentForAllocation[] = useMemo(() => {
    if (!loan || !bundle) return [];
    return bundle.installmentsByLoanId[loan.id] ?? [];
  }, [loan, bundle]);

  const currentInstallmentNumber = useMemo(() => {
    if (!loan || installments.length === 0) return 1;
    return resolveCurrentInstallmentNumber(
      installments as InstallmentArrearsInput[],
      form.paymentDate
    );
  }, [loan, installments, form.paymentDate]);

  const interestOnlySummary = useMemo(() => {
    if (!loan || !isInterestOnlyLoan(loan)) return null;
    const pending = totalPendingInterest(cycles);
    const currentCycle =
      cycles.find((c) => c.isCurrentCycle) ?? cycles[cycles.length - 1];
    const currentCycleDue = currentCycle
      ? interestOutstandingOnCycle(currentCycle)
      : calculateMonthlyInterestDue(
          loan.currentPrincipalBalance,
          loan.interestRate
        );
    return {
      pendingInterest: pending,
      currentCycleInterestDue: currentCycleDue,
      totalInterestDue: pending > 0 ? pending : currentCycleDue,
    };
  }, [loan, cycles]);

  const fixedDueSummary = useMemo(() => {
    if (!loan || !isFixedInstallmentLoan(loan) || installments.length === 0) {
      return null;
    }
    return summarizeFixedInstallmentDue(
      {
        installments,
        paymentDate: form.paymentDate,
        lateFeeRatePercent: loan.lateFeeRate,
        currentInstallmentNumber,
      },
      form.paymentDate
    );
  }, [
    loan,
    installments,
    form.paymentDate,
    currentInstallmentNumber,
  ]);

  const allocation = useMemo(() => {
    if (!loan || totalApply <= 0) return null;

    let base: PaymentAllocationResult;

    if (isInterestOnlyLoan(loan)) {
      base = allocateInterestOnlyPaymentLines(
        {
          currentPrincipal: loan.currentPrincipalBalance,
          monthlyInterestRatePercent: loan.interestRate,
          cycles,
        },
        totalApply
      );
    } else if (isFixedInstallmentLoan(loan) && installments.length > 0) {
      base = allocateFixedInstallmentPayment(
        {
          installments,
          paymentDate: form.paymentDate,
          lateFeeRatePercent: loan.lateFeeRate,
          currentInstallmentNumber,
          loanBalanceAmount: loan.balanceAmount,
        },
        totalApply
      );
    } else {
      return null;
    }

    const finalLines =
      disc > 0
        ? splitAllocationsCashAndDiscount(base.allocations, cash, disc)
        : base.allocations.filter((l) => l.amount > 0);

    const totalAllocated = sumAlloc(finalLines);
    const summary = isInterestOnlyLoan(loan)
      ? summarizeLinesForInterestOnlyPayment(finalLines, base.summary)
      : summarizeLinesForFixedPayment(
          finalLines,
          currentInstallmentNumber,
          base.summary
        );

    const merged: PaymentAllocationResult = {
      ...base,
      allocations: finalLines,
      summary,
      totalAllocated,
      unallocated: roundLKR(totalApply - totalAllocated),
    };
    return merged;
  }, [
    loan,
    totalApply,
    cash,
    disc,
    form.paymentDate,
    cycles,
    installments,
    currentInstallmentNumber,
  ]);

  const allocationRows = useMemo(() => {
    if (!loan || !allocation) return [];
    if (isInterestOnlyLoan(loan)) {
      return buildInterestOnlyAllocationRows(cycles, allocation);
    }
    if (isFixedInstallmentLoan(loan)) {
      return buildFixedInstallmentAllocationRows(
        installments,
        allocation,
        form.paymentDate,
        loan.lateFeeRate
      );
    }
    return [];
  }, [loan, allocation, cycles, installments, form.paymentDate]);

  const receipt = useMemo(() => {
    if (!loan || !allocation) return null;
    if (isInterestOnlyLoan(loan)) {
      return buildInterestOnlyReceipt(
        allocation,
        loan.interestRate,
        cash,
        disc
      );
    }
    if (isFixedInstallmentLoan(loan) && fixedDueSummary) {
      return buildFixedInstallmentReceipt(
        allocation,
        loan.balanceAmount,
        fixedDueSummary.totalDue,
        cash,
        disc
      );
    }
    return null;
  }, [loan, allocation, fixedDueSummary, cash, disc]);

  const fixedArrears = useMemo(() => {
    if (!loan || !isFixedInstallmentLoan(loan) || installments.length === 0) {
      return null;
    }
    return getFixedLoanArrearsSummary(
      installments as InstallmentArrearsInput[],
      form.paymentDate,
      loan.lateFeeRate
    );
  }, [loan, installments, form.paymentDate]);

  const paymentNextDue = useMemo(() => {
    if (!loan) return null;
    if (isInterestOnlyLoan(loan)) {
      return getNextDueDateForInterestOnly(
        loan.startDate,
        cycles,
        form.paymentDate
      );
    }
    if (isFixedInstallmentLoan(loan) && installments.length) {
      return getNextDueDateForFixedInstallments(
        installments as InstallmentArrearsInput[],
        loan.lateFeeRate,
        form.paymentDate
      );
    }
    return null;
  }, [loan, cycles, installments, form.paymentDate, loan?.lateFeeRate]);

  return {
    appliedTotal: totalApply,
    cashAmount: cash,
    discountAmount: disc,
    cycles,
    installments,
    currentInstallmentNumber,
    interestOnlySummary,
    fixedDueSummary,
    allocation,
    allocationRows,
    receipt,
    fixedArrears,
    arrearsCount: fixedArrears?.arrearsInstallmentCount ?? 0,
    paymentNextDue,
  };
}
