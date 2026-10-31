# Income Feature Context

## Domain Responsibility
Logging income entries tagged by source. Triggers the allocation flow in the budget feature after each entry.

## Database Tables
- `income` — id, amount, source_id, note, date, account_id, allocation_status, created_at
- `income_sources` (VS-91, migration 051) — id, key, name, parent_id, is_hidden, sort_order, created_at.
  Built-ins have a `key` (salary, freelance, business, gift, other; ecommerce under business), fixed
  ids 1–6 and fixed uuids `seed-income-source-<key>`, and are shown by key in the app language
  (`labelForIncomeSource`). The user adds their own (no key), one level deep.

## Key Business Rules
- Every income entry MUST have a source: a top-level source or a subsource. Filtering by a
  top-level source includes its subsources.
- Built-in sources cannot be renamed (they follow the app language), only hidden. A name must be
  unique among its siblings, built-in labels included, ignoring case. Hiding keeps past income;
  the picker still shows a hidden source the entry being edited uses.
- Income is money that becomes yours to keep. A loan to repay is a debt; money only passed on is
  not income. The picker says so under Gift & family support.
- New income is created `allocation_status = 'pending'` (held). It only becomes `allocated` when the user Confirms the allocation screen or allocates it from the unallocated pool (VS-19). The budget feature counts only `allocated` income toward the expense budget; `getMonthlyTotal` (history/reports) counts both.
- After saving income, navigate to `budget/AllocationScreen` with the new amount **and the income id** so Confirm can mark that row allocated. The screen also offers "Hold for later", which leaves the row pending.
- Income amounts are integers (FCFA, no decimals).
- Monthly income total = sum of all income records for the current month, regardless of source.
- Income history is filterable by source and date range.

## Files
- `IncomeLogScreen.tsx`, `IncomeSourcePicker.tsx`, `income.hooks.ts`, `income.service.ts`, `income.types.ts`
- `IncomeSourcesScreen.tsx` (route `/income/sources`), `IncomeSourceFormModal.tsx`,
  `incomeSources.service.ts`, `incomeSources.hooks.ts` (VS-91)
