# ISSUE-034 — VS-36: Planned Purchases (Shopping Lists → Expenses)

## Problem Statement

The app records what was spent, but the decision to spend happens earlier, when
the user decides what to buy. Today there is nowhere to write that down, so the
budget can't see upcoming spend and the user keeps a separate paper or notes list.
The user wants to plan purchases, tick them off in the shop, and have each tick
become a real expense.

## Product Decisions (confirmed)

1. **Checking an item confirms the actual amount.** A small sheet opens with the
   estimate prefilled. The user confirms or edits the amount, account and date
   before the expense is created. One-tap recording would silently store wrong
   amounts.
2. **Planned items never affect the budget.** Only a checked item does, and only
   because checking creates a real expense. Planning reduces nothing.
3. **Bought items show as strikethrough.** They stay in the list, showing the actual
   amount paid.
4. **Unchecking an item undoes it.** After a confirmation, the linked expense is
   deleted and the item goes back to planned.

## Design

### Data — migration 030

```
planned_lists(id, name, created_at)
planned_items(
  id, list_id → planned_lists, name,
  estimated_amount INTEGER NOT NULL,      -- whole FCFA
  category_id → categories NOT NULL,      -- an expense needs a category
  account_id → accounts NULL,             -- suggested account, editable on check
  planned_date TEXT NULL,                 -- YYYY-MM-DD
  expense_id → expenses NULL,             -- set when bought
  created_at
)
```

- **No `status` column.** An item is bought exactly when `expense_id` points at an
  existing expense. The state can't drift from the expense table.
- **Expense deleted elsewhere:** the read query LEFT JOINs `expenses`. A dangling
  `expense_id` reads as "planned" again, and the next write clears it. This needs no
  import from `planned` into `expenses`, which is forbidden.
- **Actual amount** is read live from the joined expense, so editing the expense
  keeps the list correct.

### `features/finance/planned/` — new slice

```
planned.types.ts       PlannedList, PlannedItem (+ derived `boughtAmount`)
planned.service.ts     list/item CRUD, markBought, unmarkBought
planned.hooks.ts       usePlannedLists, usePlannedItems(listId), useMarkBought
PlannedListsScreen.tsx lists with open count + estimated total
PlannedListScreen.tsx  items; checkbox toggles; strikethrough when bought
PlannedItemSheet.tsx   add/edit item (name, amount, category, date, account)
PurchaseConfirmSheet.tsx  actual amount / account / date → creates the expense
```

- **`markBought(itemId, {amount, accountId, date})`** runs in one SQLite
  transaction: `expenses.service.createExpense({... note: item.name})`, then sets
  `expense_id`. Either both happen or neither does. Amount validation stays in
  `createExpense`.
- **`unmarkBought(itemId)`** runs in one transaction: `deleteExpense`, then clears
  `expense_id`.

### Budget

No budget code changes. `markBought` creates an ordinary expense, so the existing
month-wide and per-category envelope figures, pacing and reports pick it up like
any other expense. Unbought items are invisible to the budget, and `budget` never
imports `planned`.

### Approved dependencies (update `CLAUDE.md` and `docs/ARCHITECTURE.md`)

- `planned → expenses` (create/delete the expense, read categories).
- `planned → accounts` (AccountPicker on the confirm sheet).

No other slice depends on `planned`, so no cycle is introduced.

### Routing and i18n

- `app/planned.tsx` and `app/planned/[id].tsx` are thin entry points.
- Entry: a "Planned purchases" row in the drawer.
- New namespace `planned` in `src/i18n/locales/{en,fr}/planned.ts`. All copy goes
  through `t()`, and the French catalogue is typed against English.

## Milestones

| #  | Scope | Tests (written first) |
|----|-------|-----------------------|
| M1 | Migration 030, types, list and item CRUD in `planned.service` | migration up/idempotent; create/rename/delete list; rejects zero or negative estimate; item needs a category; deleting a list removes its items |
| M2 | `markBought`, `unmarkBought`, dangling-expense reopen | markBought creates one expense with the confirmed amount and links it; actual ≠ estimate is stored as the actual; failure rolls back both writes; unmark deletes the expense and reopens; deleting the expense elsewhere reads as planned; editing the expense updates `boughtAmount` |
| M3 | Hooks, list screens, item sheet, purchase sheet, routes, drawer entry | RNTL: add item; tick opens the sheet prefilled with the estimate; confirming strikes the item through; unticking asks for confirmation; empty state |
| M4 | `planned` i18n namespace, fr smoke test | fr render of the list screen and confirm sheet |
| M5 | Sync and export: add both tables to `SYNCED_TABLES` (+ Supabase migration), as `028_sync_category_budgets` did | export/import round-trips planned rows |
| M6 | `/check-arch`, `code-reviewer`, `docs/KANBAN.md`, docs updates | — |

M2 also covers the budget rule: a planned item changes no envelope figure, and a
bought one changes it exactly as a normal expense would.

## Out of Scope (follow-ups)

- Notification reminder on `planned_date`.
- Recurring or template lists ("monthly groceries").
- Quantity and unit price per item.
- Splitting one purchase across several categories.
- Showing planned spend on the budget (committed amounts, planning-time warnings).

## Risks

- **Transactions.** `markBought` and `unmarkBought` must use the same transaction
  helper `dataTransfer` uses. A non-atomic version can leave an expense with no
  link, so ticking the item again would create a duplicate expense.
- **Over-budget on tick.** A purchase that busts an envelope is recorded like any
  other expense. The confirm sheet should surface the existing over-budget warning
  if it can be reached through `expenses` without a new dependency.
