/**
 * @deprecated Import from ./lateFeeEngineV3. Re-exports for backward compatibility.
 */
import {
  calculateBaseLateFee,
  calculateLateMonthsFromIndex as calculateOverdueMonths,
  computeLoanLateFeesV3,
  generateMonthlySchedule,
  getLateFeeLineByInstallmentId,
  resolveCurrentIndex,
  type LateFeeEngineInput,
  type LateFeeEngineInstallmentInput,
  type LateFeeEngineLine,
  type LateFeeEngineResult,
  type LateFeeInstallmentStatus,
} from './lateFeeEngineV3';

export {
  calculateBaseLateFee,
  calculateOverdueMonths,
  generateMonthlySchedule,
  getLateFeeLineByInstallmentId,
  resolveCurrentIndex,
  type LateFeeEngineInput,
  type LateFeeEngineInstallmentInput,
  type LateFeeInstallmentStatus,
};

/** @deprecated Use lateMonths on LateFeeEngineLine from v3 */
export type LateFeeEngineLineV2 = Omit<LateFeeEngineLine, 'lateMonths'> & {
  overdueMonths: number;
};

/** @deprecated Use LateFeeEngineResult from v3 */
export type LateFeeEngineResultV2 = Omit<LateFeeEngineResult, 'lines' | 'currentIndex'> & {
  lines: LateFeeEngineLineV2[];
};

function toV2Line(line: LateFeeEngineLine): LateFeeEngineLineV2 {
  const { lateMonths, installmentIndex, ...rest } = line;
  void installmentIndex;
  return { ...rest, overdueMonths: lateMonths };
}

export function computeLoanLateFeesV2(
  input: LateFeeEngineInput
): LateFeeEngineResultV2 {
  const result = computeLoanLateFeesV3(input);
  return {
    ...result,
    lines: result.lines.map(toV2Line),
  };
}
