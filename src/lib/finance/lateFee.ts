/**
 * @deprecated Import from ./lateFeeEngine instead. Thin compatibility layer.
 */
import {
  computeLoanLateFeesV3 as computeLoanLateFees,
  calculateBaseLateFee,
  type LateFeeEngineInstallmentInput,
  type LateFeeEngineLine,
  type LateFeeEngineResult,
} from './lateFeeEngineV3';

export {
  computeLoanLateFees,
  calculateBaseLateFee as calculateBaseLateFeeUnit,
  type LateFeeEngineLine as LateFeeInstallmentBreakdown,
  type LateFeeEngineResult as CalculateLateFeeResult,
  type LateFeeEngineInstallmentInput as LateFeeScheduleInstallment,
};

export interface CalculateLateFeeInput {
  monthlyInstallment: number;
  lateFeeRate: number;
  paymentDate: string;
  schedule: Array<{
    installmentNumber: number;
    dueDate: string;
    installmentAmount: number;
    paidAmount: number;
    lateFeePaid?: number;
    lateFeeAccrued?: number;
  }>;
}

/** @deprecated Use computeLoanLateFees from ./lateFeeEngine */
export function calculateLateFee(input: CalculateLateFeeInput): LateFeeEngineResult {
  const engine = computeLoanLateFees({
    monthlyInstallment: input.monthlyInstallment,
    lateFeeRatePercent: input.lateFeeRate,
    paymentDate: input.paymentDate,
    installments: input.schedule.map((row, index) => ({
      installmentId: `legacy-${row.installmentNumber}-${index}`,
      installmentNumber: row.installmentNumber,
      dueDate: row.dueDate,
      installmentAmount: row.installmentAmount,
      paidAmount: row.paidAmount,
      lateFeePaid: row.lateFeePaid,
    })),
  });

  return {
    ...engine,
    installments: engine.lines.map((line) => ({
      installmentNumber: line.installmentNumber,
      dueDate: line.dueDate,
      installmentAmount:
        input.schedule.find((s) => s.installmentNumber === line.installmentNumber)
          ?.installmentAmount ?? 0,
      isOverdue: line.status === 'OVERDUE' || line.status === 'PARTIAL',
      overdueMonths: line.lateMonths,
      lateFee: line.lateFee,
      lateFeeOutstanding: line.lateFeeOutstanding,
    })),
  } as LateFeeEngineResult & {
    installments: Array<{
      installmentNumber: number;
      dueDate: string;
      installmentAmount: number;
      isOverdue: boolean;
      overdueMonths: number;
      lateFee: number;
      lateFeeOutstanding: number;
    }>;
  };
}

/** @deprecated Use computeLoanLateFees */
export function calculateInstallmentLateFeeFromBase(
  inst: {
    installmentNumber: number;
    dueDate: string;
    installmentAmount: number;
    paidAmount: number;
    lateFeePaid?: number;
  },
  monthlyInstallment: number,
  lateFeeRatePercent: number,
  paymentDate: string
): {
  monthsLate: number;
  lateFeeAmount: number;
  lateFeeOutstanding: number;
  isOverdue: boolean;
} {
  const result = computeLoanLateFees({
    monthlyInstallment,
    lateFeeRatePercent,
    paymentDate,
    installments: [
      {
        installmentId: `single-${inst.installmentNumber}`,
        ...inst,
      },
    ],
  });
  const line = result.lines[0];
  return {
    monthsLate: line?.lateMonths ?? 0,
    lateFeeAmount: line?.lateFee ?? 0,
    lateFeeOutstanding: line?.lateFeeOutstanding ?? 0,
    isOverdue: line?.status === 'OVERDUE' || line?.status === 'PARTIAL',
  };
}
