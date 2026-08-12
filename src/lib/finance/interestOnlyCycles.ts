import {
  countInterestCyclesDueByDate,
  interestCyclePeriodBounds,
  nextInterestDueDateAfter,
} from './dueDates';
import {
  calculateMonthlyInterestDue,
  totalPendingInterest,
  type InterestCycleForAllocation,
} from './interestOnly';
import { roundLKR } from './money';
import { getSystemToday } from '../time/systemTime';

export interface InterestOnlyLoanSummary {
  cyclesDueCount: number;
  pendingInterest: number;
  nextDueDate: string;
  nextEstimatedInterest: number;
}

export function summarizeInterestOnlyLoan(
  startDate: string,
  monthlyRatePercent: number,
  currentPrincipal: number,
  cycles: InterestCycleForAllocation[],
  asOfDate: string = getSystemToday()
): InterestOnlyLoanSummary {
  return {
    cyclesDueCount: countInterestCyclesDueByDate(startDate, asOfDate),
    pendingInterest: totalPendingInterest(cycles),
    nextDueDate: nextInterestDueDateAfter(startDate, asOfDate),
    nextEstimatedInterest: calculateMonthlyInterestDue(
      currentPrincipal,
      monthlyRatePercent
    ),
  };
}

/** Build allocation rows for cycles 1..dueCount (tests / previews). */
export function buildDueInterestCyclesForAllocation(
  startDate: string,
  monthlyRatePercent: number,
  openingPrincipal: number,
  asOfDate: string,
  existing: InterestCycleForAllocation[] = []
): InterestCycleForAllocation[] {
  const dueCount = countInterestCyclesDueByDate(startDate, asOfDate);
  const result: InterestCycleForAllocation[] = [];
  let runningOpening = openingPrincipal;

  for (let n = 1; n <= dueCount; n++) {
    const found = existing.find((c) => c.cycleNumber === n);
    if (found) {
      result.push({
        ...found,
        isCurrentCycle: n === dueCount,
      });
      runningOpening = roundLKR(
        found.openingPrincipal - (found.principalPaid ?? 0)
      );
      continue;
    }

    const { dueDate } = interestCyclePeriodBounds(startDate, n);
    const interestDue = calculateMonthlyInterestDue(
      runningOpening,
      monthlyRatePercent
    );
    result.push({
      id: `synthetic-${n}`,
      cycleNumber: n,
      dueDate,
      openingPrincipal: runningOpening,
      interestDue,
      interestPaid: 0,
      principalPaid: 0,
      isCurrentCycle: n === dueCount,
    });
  }

  return result;
}
