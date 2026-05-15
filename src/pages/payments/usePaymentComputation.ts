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
  buildFixedInstallmentReceipt,
  buildInterestOnlyReceipt,
} from '../../lib/finance/receipt';
import {
  interestOutstandingOnCycle,
  totalPendingInterest,
  type InterestCycleForAllocation,
} from '../../lib/finance/interestOnly';
import { calculateMonthlyInterestDue } from '../../lib/finance/interestOnly';
import type { PaymentPreviewBundle } from './paymentPreviewData';

export interface PaymentFormState {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  notes: string;
  chequeNumber: string;
  bankReference: string;
}

export function usePaymentComputation(
  loan: Loan | null | undefined,
  bundle: PaymentPreviewBundle | null,
  form: PaymentFormState
) {
  const cycles: InterestCycleForAllocation[] = useMemo(() => {
    if (!loan || !bundle) return [];
    return bundle.interestCyclesByLoanId[loan.id] ?? [];
  }, [loan, bundle]);

  const installments: InstallmentForAllocation[] = useMemo(() => {
    if (!loan || !bundle) return [];
    return bundle.installmentsByLoanId[loan.id] ?? [];
  }, [loan, bundle]);

  const currentInstallmentNumber = useMemo(() => {
    if (!loan || !bundle) return 1;
    return bundle.currentInstallmentNumberByLoanId[loan.id] ?? 1;
  }, [loan, bundle]);

  const interestOnlySummary = useMemo(() => {
    if (!loan || !isInterestOnlyLoan(loan)) return null;
    const pending = totalPendingInterest(cycles);
    const currentCycle = cycles.find((c) => c.isCurrentCycle) ?? cycles[cycles.length - 1];
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
  }, [loan, installments, form.paymentDate, currentInstallmentNumber]);

  const allocation = useMemo(() => {
    if (!loan || form.amount <= 0) return null;

    if (isInterestOnlyLoan(loan)) {
      return allocateInterestOnlyPaymentLines(
        {
          currentPrincipal: loan.currentPrincipalBalance,
          monthlyInterestRatePercent: loan.interestRate,
          cycles,
        },
        form.amount
      );
    }

    if (isFixedInstallmentLoan(loan) && installments.length > 0) {
      return allocateFixedInstallmentPayment(
        {
          installments,
          paymentDate: form.paymentDate,
          lateFeeRatePercent: loan.lateFeeRate,
          currentInstallmentNumber,
          loanBalanceAmount: loan.balanceAmount,
        },
        form.amount
      );
    }

    return null;
  }, [loan, form.amount, form.paymentDate, cycles, installments, currentInstallmentNumber]);

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
      return buildInterestOnlyReceipt(allocation, loan.interestRate);
    }
    if (isFixedInstallmentLoan(loan) && fixedDueSummary) {
      return buildFixedInstallmentReceipt(
        allocation,
        loan.balanceAmount,
        fixedDueSummary.totalDue
      );
    }
    return null;
  }, [loan, allocation, fixedDueSummary]);

  const arrearsCount = useMemo(() => {
    if (!fixedDueSummary) return 0;
    return installments.filter(
      (i) => i.installmentNumber < currentInstallmentNumber && i.paidAmount < i.installmentAmount
    ).length;
  }, [installments, currentInstallmentNumber, fixedDueSummary]);

  return {
    cycles,
    installments,
    currentInstallmentNumber,
    interestOnlySummary,
    fixedDueSummary,
    allocation,
    allocationRows,
    receipt,
    arrearsCount,
  };
}
