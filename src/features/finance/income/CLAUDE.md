# Income Feature Context

## Domain Responsibility
Logging income entries tagged by source. Triggers the allocation flow in the budget feature after each entry.

## Database Tables
- `income` — id, amount, source (salary | freelance | ecommerce), note, date, created_at

## Key Business Rules
- Every income entry MUST have a source tag.
- After saving income, navigate to `budget/AllocationScreen` with the new amount.
- Income amounts are integers (FCFA, no decimals).
- Monthly income total = sum of all income records for the current month, regardless of source.
- Income history is filterable by source and date range.

## Files
- `IncomeLogScreen.tsx`, `IncomeSourcePicker.tsx`, `income.hooks.ts`, `income.service.ts`, `income.types.ts`
