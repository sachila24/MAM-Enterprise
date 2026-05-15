import { roundLKR } from './money';

export interface EarlySettlementInput {
  monthsCompleted: number;
  minimumMonthsBeforeSettlement: number;
  remainingPrincipal: number;
  remainingInterest: number;
  discountPercentage: number;
  currentMonthDue: number;
  includeCurrentMonthDue: boolean;
}

export interface EarlySettlementQuote {
  eligible: boolean;
  monthsCompleted: number;
  remainingPrincipal: number;
  remainingInterest: number;
  discountPercentage: number;
  discountAmount: number;
  discountedRemainingInterest: number;
  currentMonthDue: number;
  finalSettlementAmount: number;
}

export function canRequestEarlySettlement(
  monthsCompleted: number,
  minimumMonthsBeforeSettlement: number
): boolean {
  return monthsCompleted >= minimumMonthsBeforeSettlement;
}

/**
 * Early settlement = remaining principal + discounted remaining interest + optional current month due.
 */
export function calculateEarlySettlementQuote(
  input: EarlySettlementInput
): EarlySettlementQuote {
  const {
    monthsCompleted,
    minimumMonthsBeforeSettlement,
    remainingPrincipal,
    remainingInterest,
    discountPercentage,
    currentMonthDue,
    includeCurrentMonthDue,
  } = input;

  const eligible = canRequestEarlySettlement(
    monthsCompleted,
    minimumMonthsBeforeSettlement
  );

  const discountAmount = roundLKR(
    remainingInterest * (discountPercentage / 100)
  );
  const discountedRemainingInterest = roundLKR(
    remainingInterest - discountAmount
  );
  const currentDue = includeCurrentMonthDue ? currentMonthDue : 0;
  const finalSettlementAmount = roundLKR(
    remainingPrincipal + discountedRemainingInterest + currentDue
  );

  return {
    eligible,
    monthsCompleted,
    remainingPrincipal: roundLKR(remainingPrincipal),
    remainingInterest: roundLKR(remainingInterest),
    discountPercentage,
    discountAmount,
    discountedRemainingInterest,
    currentMonthDue: roundLKR(currentDue),
    finalSettlementAmount,
  };
}
