import { roundLKR } from './money';

export interface OriginationFeeInput {
  initialPayment: number;
  serviceFee: number;
  registrationFee: number;
}

export interface OriginationFeeResult {
  initialPayment: number;
  serviceFee: number;
  registrationFee: number;
  /** Initial payment − service fee − registration fee */
  netAdvancePayment: number;
  /** Loan amount minus net advance — base for interest and fixed schedules */
  financedPrincipal: number;
}

/** Net advance = initial payment − fees (fees are business income only). */
export function computeOriginationFees(
  input: OriginationFeeInput,
  loanAmount: number
): OriginationFeeResult {
  const initialPayment = roundLKR(Math.max(0, input.initialPayment));
  const serviceFee = roundLKR(Math.max(0, input.serviceFee));
  const registrationFee = roundLKR(Math.max(0, input.registrationFee));
  const netAdvancePayment = roundLKR(
    Math.max(0, initialPayment - serviceFee - registrationFee)
  );
  const financedPrincipal = computeFinancedPrincipal(
    loanAmount,
    netAdvancePayment
  );
  return {
    initialPayment,
    serviceFee,
    registrationFee,
    netAdvancePayment,
    financedPrincipal,
  };
}

/** Gross loan amount minus net advance — financed principal. */
export function computeFinancedPrincipal(
  loanAmount: number,
  netAdvancePayment: number
): number {
  return roundLKR(Math.max(0, loanAmount - netAdvancePayment));
}

export function validateOriginationFees(
  input: OriginationFeeInput,
  loanAmount: number
): string | null {
  const fees = computeOriginationFees(input, loanAmount);
  if (fees.initialPayment < 0) return 'initialPaymentInvalid';
  if (fees.serviceFee < 0 || fees.registrationFee < 0) return 'feeAmountInvalid';
  if (
    fees.initialPayment > 0 &&
    fees.initialPayment < fees.serviceFee + fees.registrationFee
  ) {
    return 'initialPaymentLessThanFees';
  }
  if (fees.netAdvancePayment > loanAmount) return 'netAdvanceExceedsLoanAmount';
  if (loanAmount > 0 && fees.financedPrincipal <= 0) {
    return 'financedPrincipalMustBePositive';
  }
  return null;
}
