# Localization Audit Report

**Date:** 2026-05-27  
**Scope:** Full application (`src/`) — all modules listed in the audit request  
**Translation system:** `src/lib/i18n/simpleLabels.ts` (bilingual `bi()` strings) + `useT()` / `formatMessage()` / `formatEnum()` / `documentLabels.ts`

---

## 1. Files scanned

| Area | Files |
|------|--------|
| **Total TypeScript/TSX under `src/`** | **142** |
| Pages | Dashboard, Customers, Loans (list, detail, create, early settlement), Payments, Receipts, Documents, Bikes, Guarantees, Expenses, Reports, Activity Log, Backup, Staff, Settings, Login |
| Components | Layout, loans (ledger, schedule), payments, documents (print), guarantees, bikes, customers, UI (StatusChip, Toast, etc.) |
| Lib (display/i18n only touched) | `simpleLabels.ts`, `messages.ts`, `documentLabels.ts`, `format.ts`, `ledgerDisplay.ts` |
| **Not UI-localized (intentional)** | `seedDemoData.ts`, finance calculators, repositories, DB types |

**Audit helper:** `scripts/i18n-audit.mjs` (key usage + JSX text heuristic). Raw output: `docs/LOCALIZATION_AUDIT_DATA.json`.

---

## 2. Hardcoded strings found (summary)

### Fixed in this pass (user-facing)

| Module / file | Examples that were hardcoded |
|---------------|------------------------------|
| **Expenses** | `ExpensesList.tsx`, `AddExpense.tsx` — titles, KPIs, categories, table headers, placeholders, buttons |
| **Backup** | `Backup.tsx` — entire page (sync card, manual backup, history table) |
| **Staff** | `Staff.tsx` — header, table, invite modal |
| **Business Settings** | `Settings.tsx` — all section labels, options, save bar (+ minimal `formData` state so bindings work) |
| **Early Settlement** | `EarlySettlement.tsx` — not-found, quote rows, discount/settlement labels, actions |
| **Create Loan** | `CreateLoan.tsx` — terms steps, review panel, calculation sidebar, bike hint |
| **Customers** | `CustomerDetail.tsx` — contact/account sections, tabs, active loans |
| **Guarantees** | `AddGuarantee.tsx` — loan summary chips, confirm step |
| **Documents** | `DocumentView.tsx` — empty state; print templates — collateral field labels |
| **Dashboard** | Overdue tooltips; `formatOverdueHuman` now respects display mode |
| **Layout** | `LanguageSwitcher`, `Header`, `AppShell` — a11y labels; language options no longer mix scripts in EN mode |
| **Loans** | `InstallmentScheduleTable.tsx` — column headers |

### Remaining (acceptable / follow-up)

| Location | Reason |
|----------|--------|
| Receipt/invoice **company address & phone** | Business contact data (same in all modes) |
| `PaymentReceiptPrint.tsx` company title `M A M TRADING` | Business branding |
| `DevTimePanel.tsx` | Developer-only tool; not end-user UI |
| `CurrencyInput` `LKR` prefix | Currency code (business constant) |
| Legacy `src/i18n/dictionaries/en.ts`, `si.ts`, `ta.ts` | **Unused** — superseded by `simpleLabels.ts` |
| `formatEnum()` unknown values | Falls back to English Title Case (no Sinhala mapping) |

---

## 3. Missing translation keys

**Before fixes:** 0 missing keys referenced in code (keys existed but many UIs did not call `t()`).

**After fixes:** **0 missing** — all `t()` / `tf()` / `getLabel()` references resolve to `simpleLabels.ts`.

**New keys added:** ~120 keys (expenses, backup, staff, settings, early settlement, schedule table, layout a11y, customer detail, documents, enum mappings).

---

## 4. Duplicate translation keys

Same **English** concept appears under multiple keys (by design or historical growth). Examples:

| English concept | Keys |
|-----------------|------|
| Current Due Balance | `ledgerColBalance`, `currentDueBalance` |
| Expenses | `nav.expenses`, `reportCategoryExpenses`, `expenseAdded` (different contexts) |
| Payment method | `paymentMethod`, `paymentMethodLabel` |
| In stock | `inStock`, `statusInStock` |
| Close | `action.close` (nav keys use dotted `action.*` and flat keys coexist) |

**Recommendation:** Consolidate only when touching those areas; not required for language-mode correctness.

**Legacy duplicate system:** `src/i18n/dictionaries/*.ts` duplicates nav strings from `simpleLabels` but is **not imported** anywhere.

---

## 5. Unused translation keys

| Metric | Count |
|--------|--------|
| Total keys in `simpleLabels.ts` | **825** |
| Keys referenced from app code | **637** |
| **Unused** | **188** |

Many unused keys are **intentionally pre-defined** for:

- CSV report headers (`csvDate`, `csvReceipt`, …)
- Ledger/allocation labels used indirectly or in future flows
- Document filters (`docFilter*`, `docType*`)
- Actions not yet wired in every screen (`action.delete`, `action.export`)

Full unused list: see `unused` array in `docs/LOCALIZATION_AUDIT_DATA.json`.

---

## 6. Mixed-language issues

| Issue | Status |
|-------|--------|
| **Language switcher** showed `EN + සිං` in all modes | **Fixed** — `langModeBoth` / `langModeEnglish` / `langModeSinhala` |
| **Pages with English-only copy** (Expenses, Backup, Staff, Settings, Early Settlement, Create Loan review) | **Fixed** |
| **`formatOverdueHuman`** always English | **Fixed** — uses `overdueDaysOnly`, `overdueMonthsOnly`, `overdueMonthsAndDays` |
| **Sinhala in EN mode** via raw JSX | **Reduced** — primary user routes now use `t()` |
| **Bilingual mode** | Uses `bi(en, si)` format via `getLabel(..., 'both')` |
| **Receipts** | Labels via `documentLabels.ts`; address/phone remain single-language business data |

---

## 7. Fixes applied

### Translation catalog

- Extended `src/lib/i18n/simpleLabels.ts` with module-specific keys and `ENUM_LABEL_KEYS` for expense categories, backup types, staff roles.
- Extended `src/lib/i18n/documentLabels.ts` for print collateral/sale fields.
- Exported `getFormatDisplayMode()` from `src/lib/format.ts` for non-React display helpers.

### Runtime behavior

- `formatOverdueHuman(days, mode)` in `ledgerDisplay.ts` localizes overdue phrases.
- `Dashboard` passes `language` into overdue formatting.

### Pages & components updated

`ExpensesList`, `AddExpense`, `Backup`, `Staff`, `Settings`, `EarlySettlement`, `CreateLoan`, `CustomerDetail`, `AddGuarantee`, `DocumentView`, `Dashboard`, `BikeDetail`, `InstallmentScheduleTable`, `LanguageSwitcher`, `Header`, `AppShell`, `LoanInvoicePrint`, `CashSaleInvoicePrint`.

### Not changed (per requirements)

- Business logic, calculations, repositories, database structures.
- Demo seed data content.

---

## Language mode verification checklist

| Mode | Expected behavior |
|------|-------------------|
| **EN** | English only from `t()` / `formatEnum` / documents |
| **SI** | Sinhala only (naturalized via `sinhalaNaturalizer` where configured) |
| **Both** | `English (Sinhala)` bilingual strings |

**Suggested manual smoke test:** Switch language in header → visit Expenses, Backup, Staff, Settings, Create Loan (all steps), Loan Detail, Early Settlement, Documents empty state, Dashboard overdue list.

---

## Artifacts

- `scripts/i18n-audit.mjs` — re-run with `node scripts/i18n-audit.mjs`
- `docs/LOCALIZATION_AUDIT_DATA.json` — machine-readable key/hardcoded snapshot
