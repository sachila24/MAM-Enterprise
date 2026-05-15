# Local demo mode

MAM Enterprise can run entirely in the browser without Supabase. Data is stored under the `localStorage` key `mam_demo_db_v1`.

## Behaviour

- On first load, `initLocalDemoDb()` seeds sample customers, bikes, loans, payments, guarantees, receipts, and expenses.
- All list/detail/create flows read and write through repositories in `src/lib/local-db/repositories/`.
- **Record Payment** applies the same finance allocation libraries as production, then persists payment rows, allocations, receipt, and updated loan/installment or interest-cycle balances.
- **Create Loan** generates interest cycles (interest-only) or installment schedules (fixed term) and marks linked bikes as `SOLD` for bike installment loans.
- The header shows a **Local demo mode** banner with **Reset demo data** (clears storage and re-seeds).

## Key files

| Path | Role |
|------|------|
| `src/lib/local-db/types.ts` | DB row shapes |
| `src/lib/local-db/localDb.ts` | `getDb`, `saveDb`, `seedDemoDb`, `resetDemoDb` |
| `src/lib/local-db/seedDemoData.ts` | Initial seed |
| `src/lib/local-db/useDemoDb.ts` | React hook — re-renders on DB changes |
| `src/lib/local-db/paymentBundle.ts` | Builds payment wizard context from DB |
| `src/lib/local-db/loanDetail.ts` | Loan detail view from DB |
| `src/lib/local-db/repositories/*` | CRUD and `recordPayment` / `createLoan` |

## Seeded loans

- `LN-IO-0001` — Kamal, interest-only LKR 100k @ 5%
- `LN-FIX-0001` — Nimal, fixed LKR 300k / 36 mo, arrears on installments 2–3
- `LN-BIKE-0001` — Saman, Honda Dio installment

## Replacing with Supabase

1. Implement repository interfaces against Supabase tables (schema in `supabase/migrations/`).
2. Remove or gate `initLocalDemoDb()` and the demo banner.
3. Swap page imports from `local-db/repositories` to the Supabase adapters.

Finance logic in `src/lib/finance/` stays unchanged.
