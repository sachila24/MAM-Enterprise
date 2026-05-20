/**
 * @deprecated Import from ./lateFeeEngineV3.
 */
import {
  calculateBaseLateFee,
  calculateLateMonthsFromIndex as calculateOverdueMonths,
  computeLoanLateFeesV3,
  getLateFeeLineByInstallmentId,
  type LateFeeEngineInput,
  type LateFeeEngineInstallmentInput,
  type LateFeeEngineLine,
  type LateFeeEngineResult,
  type LateFeeInstallmentStatus,
} from './lateFeeEngineV3';

export {
  calculateBaseLateFee,
  calculateOverdueMonths,
  getLateFeeLineByInstallmentId,
  type LateFeeEngineInput,
  type LateFeeEngineInstallmentInput,
  type LateFeeInstallmentStatus,
};

export type LateFeeEngineLineCompat = Omit<LateFeeEngineLine, 'lateMonths'> & {
  monthsLate: number;
  overdueMonths: number;
};

export type LateFeeEngineResultCompat = Omit<
  LateFeeEngineResult,
  'lines' | 'currentIndex'
> & {
  lines: LateFeeEngineLineCompat[];
};

function toCompatLine(line: LateFeeEngineLine): LateFeeEngineLineCompat {
  const { lateMonths, installmentIndex, ...rest } = line;
  void installmentIndex;
  return { ...rest, monthsLate: lateMonths, overdueMonths: lateMonths };
}

export function computeLoanLateFees(
  input: LateFeeEngineInput
): LateFeeEngineResultCompat {
  const result = computeLoanLateFeesV3(input);
  return {
    ...result,
    lines: result.lines.map(toCompatLine),
  };
}

export function resetLateFeeDebugLogging(): void {
  /* no-op */
}
