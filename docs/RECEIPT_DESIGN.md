# Receipt — Allocation Breakdown

Receipts are generated from `payment_allocations` rows after a confirmed payment.  
Build display DTOs with `src/lib/finance/receipt.ts`.

---

## Interest-only / reducing principal

**Section: Payment allocation**

| Line | Field |
|------|-------|
| Interest paid | `InterestOnlyReceiptBreakdown.interestPaid` |
| Principal paid | `principalPaid` |
| Remaining principal | `remainingPrincipal` |

**Optional footer:**

- Pending interest remaining
- Next estimated monthly interest

**Builder:** `buildInterestOnlyReceipt(allocation, monthlyRate)`

---

## Fixed-term installment

**Section: Payment allocation**

| Line | Field |
|------|-------|
| Late fee paid | `FixedInstallmentReceiptBreakdown.lateFeePaid` |
| Installment paid | `installmentPaid` (arrears + current) |
| Remaining arrears | `remainingArrears` |
| Loan balance | `loanBalance` |

**Builder:** `buildFixedInstallmentReceipt(allocation, loanBalanceBefore, totalArrearsBefore)`

---

## Persistence (future)

Store enough in `payment_allocations` to reconstruct receipt if loan balances change later:

- `allocation_type`: INTEREST, PRINCIPAL, LATE_FEE, INSTALLMENT, ADVANCE
- `amount`, `installment_id`, `interest_cycle_id`

Receipt header: `receipt_number`, `payment_code`, customer name, loan code, date, total paid, payment method.

---

## Print layout notes

- All amounts LKR with commas (`formatLKR`)
- No UUIDs — use `loan_code`, `payment_code`, `customer_code`
- Voided payments: watermark VOIDED, hide allocation or show strikethrough
