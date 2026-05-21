# Debt Feature Context

## Domain Responsibility
People ledger — tracking informal lending in both directions with due dates and reminders.

## Database Tables
- `debts` — id, person_name, amount, direction (lent | owed), date, due_date (nullable), status (pending | settled), note, settled_at, created_at

## Key Business Rules
- Money lent to others is tracked but NOT counted as available income until repaid and logged as income.
- Money owed to others is factored into expense obligations in reports.
- Settling a debt changes status to `settled` and records `settled_at`.
- Reminders: 3 days before due date (warning), daily after due date (overdue), stop when settled.
- Person names are free text — no contact integration.

## Files
- `DebtListScreen.tsx`, `DebtDetail.tsx`, `DebtForm.tsx`, `debt.hooks.ts`, `debt.service.ts`, `debt.types.ts`
