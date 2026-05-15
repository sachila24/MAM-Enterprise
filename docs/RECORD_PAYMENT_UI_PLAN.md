# Record Payment — UI Plan

**Route:** `/payments/new`  
**Flow:** Select Customer → Select Loan → Payment → Confirm  
**Finance:** `src/lib/finance/paymentAllocation.ts`, `receipt.ts`

No Supabase wiring in this phase — use finance libs for live preview only.

---

## Step 1 — Select customer

- Search by name, NIC, phone
- Show `customer_code` (not UUID)
- Filter loans to selected customer in step 2

---

## Step 2 — Select loan

- List active loans for customer
- Show: `loan_code`, purpose, repayment method label, balance
- On select, branch UI by `repayment_method`

---

## Step 3 — Payment (branch by method)

### A. `INTEREST_ONLY_REDUCING_PRINCIPAL`

**Display (read-only):**

| Field | Source |
|-------|--------|
| Current principal | `loan.current_principal_balance` |
| Current cycle interest due | current open cycle `interest_due - interest_paid` |
| Pending interest | `totalPendingInterest(cycles)` or `loan.pending_interest_amount` |
| Total interest due | pending + current cycle |

**Input:**

- Payment amount (`CurrencyInput`, no spinners)

**Allocation preview** (`allocateInterestOnlyPaymentLines`):

1. Pending/current interest (oldest cycle first)
2. Principal reduction
3. New principal balance
4. Pending interest remaining
5. Next estimated interest (`calculateNextCycleInterestDue`)

**Rules:**

- No late fees
- Unpaid interest remains on cycle as PENDING/PARTIAL

---

### B. `FIXED_TERM_INSTALLMENT`

**Display:**

| Field | Source |
|-------|--------|
| Due installments (arrears) | installments before current with outstanding |
| Late fees | `summarizeFixedInstallmentDue().totalLateFeesDue` |
| Current installment | current month outstanding |
| Total due | late fees + arrears + current |

**Input:**

- Payment amount
- Quick-fill: Total due, Current installment, Custom

**Allocation preview** (`allocateFixedInstallmentPayment`):

1. Late fees paid
2. Installments paid (arrears + current)
3. Arrears remaining after payment
4. Loan balance after payment
5. Advance amount (if any)

**Defaults:**

- `late_fee_rate` default **5%** (owner may change on loan)

---

## Step 4 — Confirm

- Customer, loan code, amount, method, date
- Full allocation summary (same as preview)
- Confirm → future: persist `loan_payments` + `payment_allocations`

---

## Components

| Component | Purpose |
|-----------|---------|
| `PaymentCustomerStep` | Step 1 |
| `PaymentLoanStep` | Step 2 |
| `InterestOnlyPaymentForm` | Step 3A + preview |
| `FixedInstallmentPaymentForm` | Step 3B + preview |
| `PaymentAllocationPreview` | Shared preview panel |

---

## Types

Use `InterestOnlyPaymentPreview` and `FixedInstallmentPaymentPreview` from `src/types/loan.ts`.
