# MAM Enterprise — Migration Plan

**Status:** Design phase — **do not create production Supabase yet.**  
**Last updated:** 2026-05-15 (business rules confirmed)

## Pause: production database

Production Supabase setup is **stopped** until the loan finance model is reviewed and signed off. The app remains frontend-only; no `@supabase/supabase-js` wiring in this phase.

## Loan model summary

Two repayment methods support two business products:

| Loan purpose | Allowed repayment methods | Default method |
|--------------|---------------------------|----------------|
| `CASH_LOAN` | `INTEREST_ONLY_REDUCING_PRINCIPAL`, `FIXED_TERM_INSTALLMENT` | User chooses |
| `BIKE_INSTALLMENT` | Both (cash path on finance amount) | `FIXED_TERM_INSTALLMENT` |

| Method | Calculation | Schedule storage |
|--------|-------------|------------------|
| Interest-only / reducing principal | Monthly interest on **current** principal; payment applies interest first, then principal | `loan_interest_cycles` |
| Fixed term installment | Flat rate × term; equal installments | `loan_installments` |

Guarantees flow: **Customer → Loan → Guarantee** (`guarantees` table, not collaterals).

## Confirmed business rules

### Interest-only / reducing principal

- Due dates: same calendar day each month (start May 15 → due June 15, July 15). See `src/lib/finance/dueDates.ts`.
- **No late fees** (`late_fee_rate` must be 0 on loan).
- Unpaid interest stays **pending** on `loan_interest_cycles` (status `PENDING` / `PARTIAL`, not `OVERDUE`).
- Payment allocation: (1) pending/current interest oldest first, (2) principal reduction.
- Next month interest = rate × **new** remaining principal.

### Fixed-term installment

- Default **late fee rate 5%** (`late_fee_rate DEFAULT 5`); owner may change per loan.
- Payment allocation: (1) late fees, (2) old arrears installments, (3) current month, (4) advance.
- Early settlement: only after **6** completed months; discount % **entered manually** by owner.
- **Bike installment:** on loan create, set linked `bikes.status = 'SOLD'`, `sold_at`, `sold_loan_id`.

### Payment & receipt UI (design only)

- `docs/RECORD_PAYMENT_UI_PLAN.md` — customer → loan → payment, method-specific preview.
- `docs/RECEIPT_DESIGN.md` — allocation breakdown on receipt.
- `src/lib/finance/receipt.ts` — builders for both methods.

## Schema migration

**File:** `supabase/migrations/20260515120000_loan_finance_model.sql`

### Core tables (this migration)

- `loans` — header with purpose, method, amounts, dates, settlement rules
- `loan_installments` — fixed-term schedule lines + late fees
- `loan_interest_cycles` — monthly cycles for interest-only loans
- `loan_payments` — payment header
- `payment_allocations` — waterfall splits per payment
- `early_settlements` — quotes/settlements (separate from normal payment)

### Reference tables (minimal stubs in same file)

- `customers`, `bikes`, `guarantees` — required for FKs; extend in an earlier `0001_core.sql` when splitting migrations

### Constraints worth noting

- `loan_purpose` + `bike_id`: bike installment requires a bike
- `repayment_method` ↔ `interest_calculation_type`: reducing vs flat must match
- `payment_allocations`: type-specific FK targets (installment, interest cycle, or neither for advance/settlement)

## Application layers (current repo)

| Layer | Location | Status |
|-------|----------|--------|
| Finance formulas | `src/lib/finance/*.ts` | Implemented |
| Documented examples | `src/lib/finance/examples.ts` | `verifyFinanceExamples()` |
| TypeScript types | `src/types/loan.ts`, `src/types/entities.ts` | Implemented |
| Create Loan UI | `docs/CREATE_LOAN_UI_PLAN.md` | Planned (not wired to Supabase) |
| Record Payment UI | `docs/RECORD_PAYMENT_UI_PLAN.md` | Planned |
| Receipt breakdown | `docs/RECEIPT_DESIGN.md` | Designed |
| Due dates | `src/lib/finance/dueDates.ts` | Implemented |
| Supabase client | — | **Not started** |

## Phased rollout (when approved)

### Phase 1 — Schema only (no app wiring)

1. Create Supabase **staging** project
2. Run `20260515120000_loan_finance_model.sql` (+ any split core migration)
3. Verify constraints, indexes, and sample inserts for both loan types

### Phase 2 — Data access

1. Add `@supabase/supabase-js` and env config
2. Generate or hand-maintain DB types from schema
3. Repositories: loans, installments, cycles, payments, allocations, settlements, guarantees

### Phase 3 — Create Loan

1. Implement wizard per `docs/CREATE_LOAN_UI_PLAN.md`
2. On submit: insert `loans` + generate `loan_installments` **or** first `loan_interest_cycles`
3. Use `src/lib/finance` for all preview and persisted amounts

### Phase 4 — Payments & settlement

1. Record Payment → `loan_payments` + `payment_allocations` via `paymentAllocation.ts`
2. Loan Detail layouts by `repayment_method`
3. Early Settlement action → `early_settlements` + settlement payment type

### Phase 5 — Production

1. Fresh production Supabase project
2. Apply same migrations
3. Seed owner/staff; no demo loan data in production

## Finance examples (acceptance)

Run in dev console after import:

```ts
import { verifyFinanceExamples, allFinanceExamplesPass } from './src/lib/finance/examples';
verifyFinanceExamples();
allFinanceExamplesPass(); // must be true
```

| # | Scenario | Expected |
|---|----------|----------|
| 1 | 100k @ 5%, pay 55k | Interest 5k, principal 50k, balance 50k, next interest 2.5k |
| 2 | 300k × 2.5% × 36 | Interest 270k, payable 570k, installment 15,834 |
| 3 | 15,834 @ 5% late fee | 792 / month; 1,584 for 2 months |
| 4 | Early settlement | Blocked &lt; 6 months; quote = principal + discounted interest + current due |

## Out of scope (this design pass)

- Supabase Auth, RLS policies, Edge Functions
- Receipt PDF generation backed by DB
- Reports SQL / materialized views
- i18n for new enum labels (follow-up)

## Next action for team

1. Review migration SQL and finance formulas with business owner  
2. Sign off `docs/CREATE_LOAN_UI_PLAN.md`  
3. Then proceed with **staging** Supabase only — not production
