# Create Loan — UI Plan

**Route:** `/loans/new`  
**Component:** `src/pages/loans/CreateLoan.tsx` (to be refactored)  
**Finance:** `src/lib/finance/*` — no inline formulas in the page

## Wizard steps

```
Step 1: Customer
Step 2: Loan purpose
Step 3: Repayment method
Step 4: Terms (branch by method)
Step 5: Bike / guarantee (branch by purpose)
Step 6: Review & confirm
```

### Step 1 — Select customer

- Searchable select by name, NIC, phone
- Show customer code (not UUID)
- Required before Next

### Step 2 — Loan purpose

| Option | Value | Notes |
|--------|-------|-------|
| Cash Loan | `CASH_LOAN` | |
| Bike Installment | `BIKE_INSTALLMENT` | Enables bike block in step 5 |

### Step 3 — Repayment method

| Option | Value |
|--------|-------|
| Monthly Interest / Reducing Principal | `INTEREST_ONLY_REDUCING_PRINCIPAL` |
| Fixed Term Installment | `FIXED_TERM_INSTALLMENT` |

**Defaults:**

- `BIKE_INSTALLMENT` → pre-select `FIXED_TERM_INSTALLMENT` (user may change only if product rules allow both on bike)
- `CASH_LOAN` → no default; user must choose

**Validation:**

- Bike + interest-only: allowed if business confirms (same as cash on finance amount)
- Hide incompatible combinations if product rules tighten later

---

## Step 4a — Interest-only terms

**Fields:**

| Field | Maps to `loans` |
|-------|-----------------|
| Loan amount | `principal_amount`, `original_principal_amount`, `current_principal_balance` |
| Monthly interest rate (%) | `interest_rate` + `interest_rate_period = MONTHLY` |
| Start date | `start_date` |
| Due day (1–28) | `due_day` |
| First due date | `first_due_date` — auto: start + 1 month, same day (`computeFirstDueDate`) |
| Due day | `due_day` from start date (1–28) |

**Calculation card** (live, from `interestOnly.ts`):

- Current principal
- Monthly interest due (`calculateMonthlyInterestDue`)
- Total principal balance (same as current at origination)

**Info banner:** Guarantee required — add after loan creation via Loan Detail → Guarantees.

**On submit (future):** Create loan + first `loan_interest_cycles` row (cycle 1, opening principal = loan amount).

---

## Step 4b — Fixed term installment terms

**Fields:**

| Field | Maps to `loans` |
|-------|-----------------|
| Finance amount | `principal_amount`, etc. |
| Term (months) | `term_months` |
| Monthly flat rate (%) | `interest_rate` |
| Late fee rate (%) | `late_fee_rate` — **default 5%** (`DEFAULT_LATE_FEE_RATE_PERCENT`) |
| Start date | `start_date` |
| First due date | `first_due_date` |
| Discount (optional) | `discount_amount` |

**Calculation card** (from `fixedInstallment.ts`):

- Finance amount
- Total interest (`finance × rate% × months`)
- Total payable (after discount)
- Monthly installment (`ceil(totalPayable / term)`)
- Late fee per month if overdue (`calculateLateFeePerMonth`)

**On submit (future):** Create loan + `loan_installments` rows from `buildFixedInstallmentSchedule`.  
**Bike installment:** in same transaction, `UPDATE bikes SET status = 'SOLD', sold_at = now(), sold_loan_id = loan.id`.

---

## Step 5 — Bike / guarantee

### Cash loan

- Message: guarantees optional; add on Loan Detail after creation
- No bike fields

### Bike installment

| Field | Source |
|-------|--------|
| Select bike (in stock) | `bikes` |
| Bike selling price | from bike or editable |
| Down payment | user input |
| **Finance amount** | `sellingPrice - downPayment` (read-only, `calculateBikeFinanceAmount`) |

Finance amount feeds step 4b (or 4a if method is interest-only).

---

## Step 6 — Review

- Customer name + code
- Purpose + method (formatted labels)
- All terms and calculation summary
- Bike summary if applicable
- **Confirm** persists via API (later); for now mock success toast

---

## Layout & UX rules

- **No UUID** in UI — use `loan_code`, `customer_code`, `payment_code`
- **Money:** LKR with commas (`formatLKR`); use `CurrencyInput` — no `type="number"` spinners
- **Rates:** plain text/decimal inputs, no spinners
- Sticky calculation panel on desktop (right column), stacked on mobile
- Stepper shows 6 steps; collapse 4a/4b as one “Terms” step in stepper label

---

## Loan Detail (post-create) — layout by method

### Interest-only (`LoanDetail`)

- KPIs: current principal, current month interest due, total paid
- Tab: **Interest cycles** (not “Schedule”)
- Tab: Payments
- Tab: **Guarantees** (rename from Collateral)
- **Record Payment** → allocation preview (interest → principal)

### Fixed installment (`LoanDetail`)

- KPIs: total payable, paid, balance, next due
- Tab: Installment schedule (with late fee columns)
- Tab: Payments
- Tab: Guarantees
- Arrears summary (aggregated late fees)
- **Early Settlement** button if `monthsCompleted >= minimumMonthsBeforeSettlement` (default 6)

---

## Record Payment (related)

**Flow:** Customer → Loan → Payment

### Interest-only loan selected

- Current principal, current interest due
- Payment amount
- Preview: `allocateInterestOnlyPaymentLines`

### Fixed installment loan selected

- Due installments, late fees, current month due
- Payment amount
- Preview: `allocateFixedInstallmentPayment`

---

## Components to add / reuse

| Component | Purpose |
|-----------|---------|
| `CurrencyInput` | Already exists |
| `DatePicker` | Start / first due |
| `Stepper` | 6 steps |
| `LoanCalculationPanel` | New — props: `variant: 'interest-only' \| 'fixed'` |
| `RepaymentMethodCards` | New — radio cards for step 3 |
| `BikeFinanceFields` | New — step 5 bike block |

---

## State shape (local, pre-Supabase)

```ts
interface CreateLoanFormState {
  customerId: string;
  loanPurpose: LoanPurpose;
  repaymentMethod: RepaymentMethod;
  // interest-only
  loanAmount?: number;
  monthlyInterestRate?: number;
  dueDay?: number;
  // fixed
  financeAmount?: number;
  termMonths?: number;
  monthlyFlatRate?: number;
  lateFeeRate?: number;
  discountAmount?: number;
  // shared
  startDate: string;
  firstDueDate: string;
  // bike
  bikeId?: string;
  sellingPrice?: number;
  downPayment?: number;
}
```

---

## Implementation order

1. Refactor `CreateLoan.tsx` step flow (UI only, mock submit) ✅ planned  
2. Wire `useMemo` calculations to finance libs ✅ available  
3. Loan Detail conditional layout (skeleton)  
4. Record Payment allocation preview  
5. Supabase insert + schedule generation (Phase 3 in `MIGRATION_PLAN.md`)
