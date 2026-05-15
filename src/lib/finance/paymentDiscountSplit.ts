import type {
  AllocationType,
  PaymentAllocationLine,
  PaymentAllocationResult,
} from './paymentAllocation';
import { roundLKR } from './money';

export function toDiscountAllocationType(
  base: AllocationType
): AllocationType | null {
  switch (base) {
    case 'LATE_FEE':
      return 'LATE_FEE_DISCOUNT';
    case 'INSTALLMENT':
      return 'INSTALLMENT_DISCOUNT';
    case 'INTEREST':
      return 'INTEREST_DISCOUNT';
    case 'PRINCIPAL':
      return 'PRINCIPAL_DISCOUNT';
    default:
      return null;
  }
}

/** Cash fills each bucket first; remaining need is satisfied by discount waiver lines. */
export function splitAllocationsCashAndDiscount(
  lines: PaymentAllocationLine[],
  cashAmount: number,
  discountAmount: number
): PaymentAllocationLine[] {
  if (discountAmount <= 0) return lines.filter((l) => l.amount > 0);

  let remainingCash = roundLKR(cashAmount);
  let remainingDiscount = roundLKR(discountAmount);
  const out: PaymentAllocationLine[] = [];

  for (const line of lines) {
    if (line.amount <= 0) continue;

    if (line.allocationType === 'ADVANCE') {
      let need = line.amount;
      const fromCash = roundLKR(Math.min(need, remainingCash));
      if (fromCash > 0) {
        out.push({ ...line, amount: fromCash });
        remainingCash = roundLKR(remainingCash - fromCash);
        need = roundLKR(need - fromCash);
      }
      if (need > 0 && remainingDiscount > 0) {
        const fromDiscount = roundLKR(Math.min(need, remainingDiscount));
        out.push({ ...line, amount: fromDiscount, allocationType: 'ADVANCE' });
        remainingDiscount = roundLKR(remainingDiscount - fromDiscount);
      }
      continue;
    }

    let need = line.amount;

    const fromCash = roundLKR(Math.min(need, remainingCash));
    remainingCash = roundLKR(remainingCash - fromCash);
    need = roundLKR(need - fromCash);
    const fromDiscount = roundLKR(Math.min(need, remainingDiscount));
    remainingDiscount = roundLKR(remainingDiscount - fromDiscount);

    if (fromCash > 0) {
      out.push({ ...line, amount: fromCash });
    }
    if (fromDiscount > 0) {
      const dt = toDiscountAllocationType(line.allocationType);
      if (dt) {
        out.push({
          ...line,
          amount: fromDiscount,
          allocationType: dt,
        });
      } else {
        out.push({ ...line, amount: fromDiscount });
      }
    }
  }

  return out;
}

export function summarizeLinesForFixedPayment(
  lines: PaymentAllocationLine[],
  currentInstallmentNumber: number,
  summary: PaymentAllocationResult['summary']
): PaymentAllocationResult['summary'] {
  let lateFeesPaid = 0;
  let installmentsPaid = 0;
  let currentMonthPaid = 0;

  for (const l of lines) {
    switch (l.allocationType) {
      case 'LATE_FEE':
      case 'LATE_FEE_DISCOUNT':
        lateFeesPaid = roundLKR(lateFeesPaid + l.amount);
        break;
      case 'INSTALLMENT':
      case 'INSTALLMENT_DISCOUNT':
        if (l.installmentNumber === currentInstallmentNumber) {
          currentMonthPaid = roundLKR(currentMonthPaid + l.amount);
        } else {
          installmentsPaid = roundLKR(installmentsPaid + l.amount);
        }
        break;
      default:
        break;
    }
  }

  return {
    ...summary,
    lateFeesPaid,
    installmentsPaid,
    currentMonthPaid,
  };
}

export function summarizeLinesForInterestOnlyPayment(
  lines: PaymentAllocationLine[],
  summary: PaymentAllocationResult['summary']
): PaymentAllocationResult['summary'] {
  let interestPaid = 0;
  let principalPaid = 0;

  for (const l of lines) {
    switch (l.allocationType) {
      case 'INTEREST':
      case 'INTEREST_DISCOUNT':
        interestPaid = roundLKR(interestPaid + l.amount);
        break;
      case 'PRINCIPAL':
      case 'PRINCIPAL_DISCOUNT':
        principalPaid = roundLKR(principalPaid + l.amount);
        break;
      default:
        break;
    }
  }

  return {
    ...summary,
    interestPaid,
    principalPaid,
  };
}
