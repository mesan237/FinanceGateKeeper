# Income Feature Context

## Domain Responsibility
Logging income entries tagged by source. Triggers the allocation flow in the budget feature after each entry.

## Database Tables
- `income` — id, amount, source (salary | freelance | ecommerce), note, date, account_id, allocation_status, created_at

## Key Business Rules
- Every income entry MUST have a source tag.
- New income is created `allocation_status = 'pending'` (held). It only becomes `allocated` when the user Confirms the allocation screen or allocates it from the unallocated pool (VS-19). The budget feature counts only `allocated` income toward the expense budget; `getMonthlyTotal` (history/reports) counts both.
- After saving income, navigate to `budget/AllocationScreen` with the new amount **and the income id** so Confirm can mark that row allocated. The screen also offers "Hold for later", which leaves the row pending.
- Income amounts are integers (FCFA, no decimals).
- Monthly income total = sum of all income records for the current month, regardless of source.
- Income history is filterable by source and date range.

## Files
- `IncomeLogScreen.tsx`, `IncomeSourcePicker.tsx`, `income.hooks.ts`, `income.service.ts`, `income.types.ts`
