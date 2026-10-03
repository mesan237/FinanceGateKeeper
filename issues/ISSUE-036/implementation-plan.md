# ISSUE-036 — VS-38: Imprévus (unplanned expenses)

## Problem Statement

The user wants to see how much of each month goes to "imprévus": spending that
caught them off guard. Nothing in the data says which expenses those are.

## Product Decisions (confirmed)

1. **A flag, not a category.** An unexpected hospital bill still belongs under
   Health. Filing it under an "Imprévus" category would distort the Health
   envelope and the category reports. The flag sits beside the category.
2. **Marked by the user, not derived.** Recurring expenses and ticked planned
   items are known to be planned, but daily food, transport and airtime are not
   on any list either. "Everything else" would flag routine spending, so the
   count would mean nothing.
3. **Off by default.** Only what the user marks counts.

## Design

### Schema

- Migration `032_add_expense_is_unplanned`: `expenses.is_unplanned INTEGER NOT
  NULL DEFAULT 0`, then the expenses update trigger is rebuilt with
  `account_id` and `is_unplanned` so flagging marks the row pending.
- Supabase: patch `038_unplanned_expenses.sql` adds the column; `schema.sql` and
  the catch-up patch `037` carry it too (the schema guard test checks both).
  Run 038 **before** installing a build with migration 032, or every sync fails.
- Sync, export/import and snapshots copy whole rows, so they need no change.

### `expenses` slice

- `Expense.isUnplanned`; `NewExpense.isUnplanned?` (optional, so quick-add,
  recurring auto-log and planned purchases keep logging planned expenses).
- `updateExpense` accepts `isUnplanned` (`ExpenseEditableFields`).
- `expenses.unplanned.ts` → `getUnplannedTotals(from, to)`: `{ count, total }`.
- `UnplannedToggle` on `ExpenseEntryPanel` (log screen and Add-Transaction sheet)
  and `ExpenseDetailScreen`.
- Feed: `ExpenseEntry.isUnplanned` (from `services/transactions.ts`), an amber
  badge in `TransactionRow`, and an "Imprévus" chip in `CategoryChips`
  (`FeedFilter = number | 'unplanned' | null`).

### `reports` slice

- `MonthlyReport.unplanned: { count, total, sharePct, previous }`, the current
  month from the loaded expenses and the previous one via `getUnplannedTotals`.
- `UnplannedCard` after Expense Performance; an empty month explains how to mark one.

### `dashboard` slice

- `DashboardState.unplanned`; `MonthOverviewCard` shows a line under the
  cashflow while the month has any.

### Copy

en/fr keys in `expenses` (`entry.unplanned*`, `list.unplanned*`), `reports`
(`unplanned.*`) and `dashboard` (`month.unplanned_one/_other`).

## Out of scope

- A switch on quick-add tiles (one-tap routine spending) and on the planned
  purchase sheet (planned by definition).
- Tapping the Reports card to open the filtered feed (the feed's month and
  filter are local state today).
