import { DEFAULT_LATE_FEE_RATE_PERCENT } from './constants';
import {
  computeLoanLateFeesV3,
  getLateFeeLineByInstallmentId,
  type LateFeeEngineInput,
  type LateFeeEngineResult,
  type LateFeeInstallmentStatus,
} from './lateFeeEngineV3';
import { roundLKR } from './money';
import {
  getAsOfDate,
  getSystemToday,
  isDateBefore,
  isDateOnOrBefore,
  normalizeDate,
} from '../time/systemTime';

export type InstallmentDisplayStatus = LateFeeInstallmentStatus;

export interface InstallmentArrearsInput {
  installmentNumber: number;
  dueDate: string;
  installmentAmount: number;
  paidAmount: number;
  lateFeeAmount: number;
  lateFeePaid: number;
}

export interface CalculatedInstallmentLateFee {
  monthsLate: number;
  isOverdue: boolean;
  lateFeeAmount: number;
  lateFeeOutstanding: number;
}

export interface FixedLoanArrearsSummary {
  arrearsInstallmentCount: number;
  arrearsInstallmentAmount: number;
  lateFeesDue: number;
  totalArrearsDue: number;
  hasArrears: boolean;
}

export interface EnrichedFixedInstallment extends InstallmentArrearsInput {
  id: string;
  displayStatus: InstallmentDisplayStatus;
  installmentRemaining: number;
  isOverdue: boolean;
  overdueMonths: number;
  lateFeeAccrued: number;
  lateFeeOutstanding: number;
  remaining: number;
}

export function toLateFeeEngineInstallments<
  T extends InstallmentArrearsInput & { id: string },
>(installments: T[]): LateFeeEngineInput['installments'] {
  return installments.map((inst) => ({
    installmentId: inst.id,
    installmentNumber: inst.installmentNumber,
    dueDate: inst.dueDate,
    installmentAmount: inst.installmentAmount,
    paidAmount: inst.paidAmount,
    lateFeePaid: inst.lateFeePaid,
    lateFeeCharged: inst.lateFeeAmount,
  }));
}

/** Run the unified late-fee engine for a loan's installments. */
export function runLateFeeEngine(
  installments: (InstallmentArrearsInput & { id: string })[],
  monthlyInstallment: number,
  lateFeeRatePercent: number = DEFAULT_LATE_FEE_RATE_PERCENT,
  options?: { paymentDate?: string | null; asOfDate?: string | null }
): LateFeeEngineResult {
  const asOf = getAsOfDate(options?.paymentDate ?? options?.asOfDate ?? undefined);
  return computeLoanLateFeesV3({
    monthlyInstallment,
    lateFeeRatePercent,
    installments: toLateFeeEngineInstallments(installments),
    paymentDate: asOf,
  });
}

export function arrearsSummaryFromEngine(
  engine: LateFeeEngineResult,
  installments: InstallmentArrearsInput[],
  asOfDate: string
): FixedLoanArrearsSummary {
  const asOf = normalizeDate(asOfDate);
  let arrearsInstallmentCount = 0;
  let arrearsInstallmentAmount = 0;

  for (const inst of installments) {
    const principalOwed = roundLKR(
      Math.max(0, inst.installmentAmount - inst.paidAmount)
    );
    if (principalOwed > 0 && isDateBefore(inst.dueDate, asOf)) {
      arrearsInstallmentCount += 1;
      arrearsInstallmentAmount = roundLKR(
        arrearsInstallmentAmount + principalOwed
      );
    }
  }

  const lateFeesDue = engine.totalLateFeeOutstanding;
  const hasPrincipalArrears = arrearsInstallmentCount > 0;
  const hasLateFeeArrears = lateFeesDue > 0;

  return {
    arrearsInstallmentCount,
    arrearsInstallmentAmount,
    lateFeesDue,
    totalArrearsDue: roundLKR(arrearsInstallmentAmount + lateFeesDue),
    hasArrears: hasPrincipalArrears || hasLateFeeArrears,
  };
}

export function enrichInstallmentsFromEngine<
  T extends InstallmentArrearsInput & { id: string },
>(installments: T[], engine: LateFeeEngineResult): Array<T & EnrichedFixedInstallment> {
  return installments.map((inst) => {
    const line = getLateFeeLineByInstallmentId(engine, inst.id);
    const monthsLate = line?.lateMonths ?? 0;
    const lateFeeAccrued = line?.lateFee ?? 0;
    const lateFeeOutstanding = line?.lateFeeOutstanding ?? 0;
    const displayStatus = line?.status ?? 'PENDING';
    const installmentRemaining = roundLKR(
      Math.max(0, inst.installmentAmount - inst.paidAmount)
    );
    const remaining = roundLKR(installmentRemaining + lateFeeOutstanding);

    return {
      ...inst,
      displayStatus,
      installmentRemaining,
      isOverdue: displayStatus === 'OVERDUE' || displayStatus === 'PARTIAL',
      overdueMonths: monthsLate,
      lateFeeAccrued,
      lateFeeOutstanding,
      remaining,
    };
  });
}

/** @deprecated Prefer runLateFeeEngine + enrichInstallmentsFromEngine */
export function calculateInstallmentLateFee(
  inst: InstallmentArrearsInput,
  lateFeeRatePercent: number = DEFAULT_LATE_FEE_RATE_PERCENT,
  today: string = getSystemToday(),
  monthlyInstallment?: number
): CalculatedInstallmentLateFee {
  const baseInstallment = monthlyInstallment ?? inst.installmentAmount;
  const engine = computeLoanLateFeesV3({
    monthlyInstallment: baseInstallment,
    lateFeeRatePercent,
    asOfDate: today,
    installments: [
      {
        installmentId: `calc-${inst.installmentNumber}`,
        installmentNumber: inst.installmentNumber,
        dueDate: inst.dueDate,
        installmentAmount: inst.installmentAmount,
        paidAmount: inst.paidAmount,
        lateFeePaid: inst.lateFeePaid,
        lateFeeCharged: inst.lateFeeAmount,
      },
    ],
  });
  const line = engine.lines[0];
  return {
    monthsLate: line?.lateMonths ?? 0,
    isOverdue: line?.status === 'OVERDUE' || line?.status === 'PARTIAL',
    lateFeeAmount: line?.lateFee ?? 0,
    lateFeeOutstanding: line?.lateFeeOutstanding ?? 0,
  };
}

export function isInstallmentFullyPaid(
  inst: InstallmentArrearsInput,
  today: string,
  lateFeeRatePercent: number = DEFAULT_LATE_FEE_RATE_PERCENT,
  monthlyInstallment?: number
): boolean {
  const { lateFeeOutstanding } = calculateInstallmentLateFee(
    inst,
    lateFeeRatePercent,
    today,
    monthlyInstallment
  );
  return (
    inst.paidAmount >= inst.installmentAmount && lateFeeOutstanding <= 0
  );
}

export function isInstallmentInArrears(
  inst: InstallmentArrearsInput,
  today: string
): boolean {
  return (
    isDateBefore(inst.dueDate, today) &&
    inst.paidAmount < inst.installmentAmount
  );
}

export function getInstallmentDisplayStatus(
  inst: InstallmentArrearsInput,
  today: string,
  lateFeeRatePercent: number = DEFAULT_LATE_FEE_RATE_PERCENT,
  monthlyInstallment?: number
): InstallmentDisplayStatus {
  const engine = computeLoanLateFeesV3({
    monthlyInstallment: monthlyInstallment ?? inst.installmentAmount,
    lateFeeRatePercent,
    asOfDate: today,
    installments: [
      {
        installmentId: `status-${inst.installmentNumber}`,
        installmentNumber: inst.installmentNumber,
        dueDate: inst.dueDate,
        installmentAmount: inst.installmentAmount,
        paidAmount: inst.paidAmount,
        lateFeePaid: inst.lateFeePaid,
        lateFeeCharged: inst.lateFeeAmount,
      },
    ],
  });
  return engine.lines[0]?.status ?? 'PENDING';
}

export function getFixedLoanArrearsSummary(
  installments: InstallmentArrearsInput[],
  today: string,
  lateFeeRatePercent: number = DEFAULT_LATE_FEE_RATE_PERCENT,
  monthlyInstallment?: number
): FixedLoanArrearsSummary {
  const withIds = installments.map((inst, index) => ({
    ...inst,
    id: `arrears-${inst.installmentNumber}-${index}`,
  }));
  const base =
    monthlyInstallment ??
    withIds[0]?.installmentAmount ??
    0;
  const engine = runLateFeeEngine(
    withIds,
    base,
    lateFeeRatePercent,
    { asOfDate: today }
  );
  return arrearsSummaryFromEngine(engine, installments, today);
}

/** @deprecated Prefer runLateFeeEngine + enrichInstallmentsFromEngine */
export function enrichFixedInstallment<
  T extends InstallmentArrearsInput & { id: string },
>(
  inst: T,
  today: string,
  lateFeeRatePercent: number,
  monthlyInstallment?: number
): T & EnrichedFixedInstallment {
  const engine = runLateFeeEngine(
    [inst],
    monthlyInstallment ?? inst.installmentAmount,
    lateFeeRatePercent,
    { asOfDate: today }
  );
  return enrichInstallmentsFromEngine([inst], engine)[0];
}

export function resolveCurrentInstallmentNumber(
  installments: InstallmentArrearsInput[],
  asOfDate: string
): number {
  const sorted = [...installments].sort(
    (a, b) => a.installmentNumber - b.installmentNumber
  );
  const asOf = normalizeDate(asOfDate);
  const dueUnpaid = sorted.filter(
    (i) =>
      isDateOnOrBefore(i.dueDate, asOf) && i.paidAmount < i.installmentAmount
  );
  if (dueUnpaid.length > 0) {
    return dueUnpaid[dueUnpaid.length - 1].installmentNumber;
  }
  const next = sorted.find((i) => !isDateOnOrBefore(i.dueDate, asOf));
  return next?.installmentNumber ?? sorted[sorted.length - 1]?.installmentNumber ?? 1;
}

export function getFixedLoanDisplayStatus(
  storedStatus: string,
  installments: InstallmentArrearsInput[],
  today: string,
  lateFeeRatePercent: number = DEFAULT_LATE_FEE_RATE_PERCENT,
  monthlyInstallment?: number
): string {
  if (
    getFixedLoanArrearsSummary(
      installments,
      today,
      lateFeeRatePercent,
      monthlyInstallment
    ).hasArrears
  ) {
    return 'OVERDUE';
  }
  return storedStatus;
}

export function oldestArrearsDueDate(
  installments: InstallmentArrearsInput[],
  today: string
): string | null {
  const arrears = installments
    .filter((i) => isInstallmentInArrears(i, today))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return arrears[0]?.dueDate ?? null;
}

export { daysBetweenDates } from '../time/systemTime';
